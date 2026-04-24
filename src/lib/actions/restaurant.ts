"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { parseDateKey } from "@/lib/utils";

// Restaurant capacity constants.
// 10 tables × 4 seats = max 40 people per exact time slot.
const TOTAL_TABLES = 10;
const SEATS_PER_TABLE = 4;

// Customer-facing reservation schema. Note: NO `tableNumber` — the server
// picks a free table automatically. The guest should only care about
// date / time / party size; capacity is an internal concern exposed only
// to restaurant staff in the /restaurant-app view.
const reserveSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hour: z.number().int().min(18).max(22),
  minute: z.union([z.literal(0), z.literal(30)]),
  partySize: z.number().int().min(1).max(SEATS_PER_TABLE),
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

    // Find which tables are already taken at this exact datetime, then
    // pick the lowest-numbered free one. We retry a couple of times on
    // P2002 to handle the race where two users pick the same free table
    // at the same moment: re-query and grab the next one.
    for (let attempt = 0; attempt < 3; attempt++) {
      const taken = await prisma.restaurantReservation.findMany({
        where: { date, status: { not: "CANCELLED" } },
        select: { tableNumber: true },
      });
      const takenSet = new Set(taken.map((r) => r.tableNumber));
      if (takenSet.size >= TOTAL_TABLES) {
        return { ok: false as const, error: "FULLY_BOOKED" as const };
      }
      const freeTable = Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1)
        .find((n) => !takenSet.has(n));
      if (freeTable == null) {
        return { ok: false as const, error: "FULLY_BOOKED" as const };
      }

      try {
        await prisma.restaurantReservation.create({
          data: {
            userId: user.id,
            date,
            tableNumber: freeTable,
            partySize: parsed.partySize,
            notes: parsed.notes,
            status: "CONFIRMED",
          },
        });
        // success
        revalidatePath("/restaurant");
        revalidatePath("/home");
        revalidatePath("/restaurant-app");
        return { ok: true as const };
      } catch (e: any) {
        // Race: another request grabbed `freeTable` between our read
        // and our insert. Retry the loop — the next iteration will
        // pick the next-free table or return FULLY_BOOKED.
        if (e?.code === "P2002") continue;
        console.error("[restaurant.reserveTable] prisma error", {
          code: e?.code,
          message: e?.message,
        });
        return { ok: false as const, error: "UNKNOWN" as const };
      }
    }

    // All 3 attempts lost the race — treat as fully booked.
    return { ok: false as const, error: "FULLY_BOOKED" as const };
  } catch (e: any) {
    console.error("[restaurant.reserveTable] fatal", {
      message: e?.message,
    });
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}

export async function cancelReservation(id: string) {
  const user = await requireUser();
  const r = await prisma.restaurantReservation.findUnique({ where: { id } });
  if (!r || r.userId !== user.id) return { ok: false as const };
  await prisma.restaurantReservation.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
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
