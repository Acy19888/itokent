"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { parseDateKey } from "@/lib/utils";
import {
  sendEmail,
  restaurantConfirmationEmail,
  restaurantCancellationEmail,
} from "@/lib/email";
import {
  MAX_SEATS_PER_TABLE,
  clampToFloor,
} from "@/lib/restaurant-config";

// Customer-facing reservation schema. The user picks a specific table
// from the floor plan; capacity is enforced per-table (party fits in
// table.seats) AND per-slot (the table isn't already booked at that
// exact datetime).
const reserveSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hour: z.number().int().min(18).max(22),
  minute: z.union([z.literal(0), z.literal(30)]),
  partySize: z.number().int().min(1).max(MAX_SEATS_PER_TABLE),
  tableNumber: z.number().int().min(1).max(999),
  notes: z.string().max(300).optional(),
});

export async function reserveTable(input: z.infer<typeof reserveSchema>) {
  try {
    const user = await requireUser();
    const parsed = reserveSchema.parse(input);

    const date = parseDateKey(parsed.dateKey);
    date.setHours(parsed.hour, parsed.minute, 0, 0);

    if (date.getTime() < Date.now()) {
      return { ok: false as const, error: "PAST" as const };
    }

    // Validate the chosen table exists, is active, and seats the party.
    const table = await prisma.restaurantTable.findUnique({
      where: { number: parsed.tableNumber },
    });
    if (!table || !table.active) {
      return { ok: false as const, error: "INVALID_TABLE" as const };
    }
    if (parsed.partySize > table.seats) {
      return { ok: false as const, error: "PARTY_TOO_LARGE" as const };
    }

    // Slot uniqueness is enforced by the @@unique([date, tableNumber])
    // index — if a concurrent booker grabbed it, P2002 surfaces below.
    try {
      const created = await prisma.restaurantReservation.create({
        data: {
          userId: user.id,
          date,
          tableNumber: table.number,
          partySize: parsed.partySize,
          notes: parsed.notes,
          status: "CONFIRMED",
        },
      });

      // Fire-and-forget confirmation email — must not block the save.
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true, name: true, locale: true },
      });
      if (fullUser?.email) {
        const { subject, html } = restaurantConfirmationEmail({
          locale: fullUser.locale === "en" ? "en" : "tr",
          userName: fullUser.name,
          date: created.date,
          partySize: created.partySize,
          notes: created.notes,
        });
        void sendEmail({ to: fullUser.email, subject, html }).catch((err) => {
          console.error("[restaurant.reserve] email dispatch failed", err?.message);
        });
      }

      revalidatePath("/restaurant");
      revalidatePath("/home");
      revalidatePath("/restaurant-app");
      return { ok: true as const };
    } catch (e: any) {
      if (e?.code === "P2002") {
        // Someone else booked this exact table+slot in the meantime.
        return { ok: false as const, error: "TABLE_TAKEN" as const };
      }
      console.error("[restaurant.reserveTable] prisma error", {
        code: e?.code,
        message: e?.message,
      });
      return { ok: false as const, error: "UNKNOWN" as const };
    }
  } catch (e: any) {
    console.error("[restaurant.reserveTable] fatal", { message: e?.message });
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}

export async function cancelReservation(id: string) {
  const user = await requireUser();
  const r = await prisma.restaurantReservation.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true, locale: true } } },
  });
  if (!r || r.userId !== user.id) return { ok: false as const };

  await prisma.restaurantReservation.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  // Cancellation email — fire-and-forget.
  if (r.user?.email) {
    const { subject, html } = restaurantCancellationEmail({
      locale: r.user.locale === "en" ? "en" : "tr",
      userName: r.user.name,
      date: r.date,
      partySize: r.partySize,
    });
    void sendEmail({ to: r.user.email, subject, html }).catch((err) => {
      console.error("[restaurant.cancel] email dispatch failed", err?.message);
    });
  }

  revalidatePath("/restaurant");
  revalidatePath("/restaurant-app");
  return { ok: true as const };
}

/** Restaurant staff: mark a reservation as checked in / no-show */
export async function markReservation(
  id: string,
  action: "CHECK_IN" | "NO_SHOW",
) {
  await requireRole("RESTAURANT_STAFF", "ADMIN");
  await prisma.restaurantReservation.update({
    where: { id },
    data:
      action === "CHECK_IN"
        ? { checkedIn: true }
        : { status: "NO_SHOW" },
  });
  revalidatePath("/restaurant-app");
  return { ok: true as const };
}

// ─── Floor-plan layout management (staff/admin) ──────────────────────

const tableSchema = z.object({
  id: z.string().optional(),  // undefined = new table
  number: z.number().int().min(1).max(999),
  seats: z.number().int().min(1).max(MAX_SEATS_PER_TABLE),
  x: z.number().int(),
  y: z.number().int(),
  shape: z.enum(["ROUND", "SQUARE"]),
  active: z.boolean(),
});

const layoutSchema = z.object({
  tables: z.array(tableSchema),
  deletedIds: z.array(z.string()),
});

/** Replace the whole table layout in one transaction. The editor sends
 *  the full list (existing rows by id + new rows without id) plus a list
 *  of ids to delete. Number uniqueness is checked client-side too. */
export async function saveLayout(input: z.infer<typeof layoutSchema>) {
  try {
    await requireRole("RESTAURANT_STAFF", "ADMIN");
    const parsed = layoutSchema.parse(input);

    // Validate number uniqueness across the submitted set.
    const numbers = new Set<number>();
    for (const t of parsed.tables) {
      if (numbers.has(t.number)) {
        return { ok: false as const, error: "DUPLICATE_NUMBER" as const, number: t.number };
      }
      numbers.add(t.number);
    }

    await prisma.$transaction(async (tx) => {
      // Soft-delete: tables with active reservations stay in DB but hidden.
      // Hard-delete: tables that are removed and have NO reservations.
      for (const id of parsed.deletedIds) {
        const tt = await tx.restaurantTable.findUnique({ where: { id } });
        if (!tt) continue;
        const refCount = await tx.restaurantReservation.count({
          where: { tableNumber: tt.number },
        });
        if (refCount === 0) {
          await tx.restaurantTable.delete({ where: { id } });
        } else {
          await tx.restaurantTable.update({
            where: { id },
            data: { active: false },
          });
        }
      }

      for (const tt of parsed.tables) {
        const { x, y } = clampToFloor(tt.x, tt.y);
        if (tt.id) {
          await tx.restaurantTable.update({
            where: { id: tt.id },
            data: {
              number: tt.number,
              seats: tt.seats,
              x,
              y,
              shape: tt.shape,
              active: tt.active,
            },
          });
        } else {
          await tx.restaurantTable.create({
            data: {
              number: tt.number,
              seats: tt.seats,
              x,
              y,
              shape: tt.shape,
              active: tt.active,
            },
          });
        }
      }
    });

    revalidatePath("/restaurant-app");
    revalidatePath("/restaurant-app/layout");
    revalidatePath("/restaurant");
    return { ok: true as const };
  } catch (e: any) {
    if (e?.code === "P2002") {
      return { ok: false as const, error: "DUPLICATE_NUMBER" as const };
    }
    console.error("[restaurant.saveLayout] error", { message: e?.message });
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}
