"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { parseDateKey } from "@/lib/utils";

const reserveSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hour: z.number().int().min(18).max(22),
  minute: z.union([z.literal(0), z.literal(30)]),
  partySize: z.number().int().min(1).max(20),
  notes: z.string().max(300).optional(),
});

export async function reserveTable(input: z.infer<typeof reserveSchema>) {
  const user = await requireUser();
  const parsed = reserveSchema.parse(input);

  const date = parseDateKey(parsed.dateKey);
  date.setHours(parsed.hour, parsed.minute, 0, 0);

  if (date.getTime() < Date.now()) {
    return { ok: false as const, error: "PAST" as const };
  }

  await prisma.restaurantReservation.create({
    data: {
      userId: user.id,
      date,
      partySize: parsed.partySize,
      notes: parsed.notes,
      status: "CONFIRMED",
    },
  });
  revalidatePath("/restaurant");
  revalidatePath("/home");
  revalidatePath("/restaurant-app");
  return { ok: true as const };
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
export async function markReservation(id: string, action: "CHECK_IN" | "NO_SHOW") {
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
