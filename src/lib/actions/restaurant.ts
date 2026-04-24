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
  MAX_PARTY_SIZE,
  TOTAL_SEATS,
  TOTAL_TABLES,
} from "@/lib/restaurant-config";

// Customer-facing reservation schema. Capacity is enforced server-side
// against TOTAL_SEATS (sum of partySizes at this exact datetime), NOT
// against a per-table cap — so large parties can book (staff will
// combine tables).
const reserveSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hour: z.number().int().min(18).max(22),
  minute: z.union([z.literal(0), z.literal(30)]),
  partySize: z.number().int().min(1).max(MAX_PARTY_SIZE),
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

    // Seat-based capacity check + table allocation.
    // We retry on P2002 so two concurrent bookers that pick the same
    // free table can fall through to the next one.
    for (let attempt = 0; attempt < 3; attempt++) {
      const existing = await prisma.restaurantReservation.findMany({
        where: { date, status: { not: "CANCELLED" } },
        select: { tableNumber: true, partySize: true },
      });
      const seatsTaken = existing.reduce((s, r) => s + r.partySize, 0);
      if (seatsTaken + parsed.partySize > TOTAL_SEATS) {
        return { ok: false as const, error: "FULLY_BOOKED" as const };
      }
      const takenTables = new Set(existing.map((r) => r.tableNumber));
      const freeTable = Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1)
        .find((n) => !takenTables.has(n));
      if (freeTable == null) {
        // Should only happen if every table is already anchored; treat
        // as fully booked regardless of seat count.
        return { ok: false as const, error: "FULLY_BOOKED" as const };
      }

      try {
        const created = await prisma.restaurantReservation.create({
          data: {
            userId: user.id,
            date,
            tableNumber: freeTable,
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
        if (e?.code === "P2002") continue;
        console.error("[restaurant.reserveTable] prisma error", {
          code: e?.code,
          message: e?.message,
        });
        return { ok: false as const, error: "UNKNOWN" as const };
      }
    }

    return { ok: false as const, error: "FULLY_BOOKED" as const };
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
