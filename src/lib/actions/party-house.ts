"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseDateKey } from "@/lib/utils";

const schema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  occasion: z.string().min(2).max(120),
  guestCount: z.number().int().min(1).max(300),
  notes: z.string().max(500).optional(),
});

export async function requestPartyBooking(input: z.infer<typeof schema>) {
  const user = await requireUser();
  const parsed = schema.parse(input);
  const date = parseDateKey(parsed.dateKey);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date.getTime() < today.getTime()) {
    return { ok: false as const, error: "PAST_DATE" as const };
  }

  try {
    await prisma.partyHouseBooking.create({
      data: {
        userId: user.id,
        date,
        occasion: parsed.occasion,
        guestCount: parsed.guestCount,
        notes: parsed.notes,
        status: "PENDING",
      },
    });
    revalidatePath("/party-house");
    revalidatePath("/admin");
    return { ok: true as const };
  } catch (e: any) {
    if (e.code === "P2002") return { ok: false as const, error: "DATE_TAKEN" as const };
    throw e;
  }
}

export async function cancelPartyBooking(id: string) {
  const user = await requireUser();
  const b = await prisma.partyHouseBooking.findUnique({ where: { id } });
  if (!b || b.userId !== user.id) return { ok: false as const };
  await prisma.partyHouseBooking.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/party-house");
  revalidatePath("/admin");
  return { ok: true as const };
}
