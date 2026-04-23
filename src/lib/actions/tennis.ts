"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseDateKey } from "@/lib/utils";

const OPEN_HOUR = 9;   // 9:00 AM first slot
const CLOSE_HOUR = 20; // last slot starts at 19:00

const bookSchema = z.object({
  courtId: z.string().cuid(),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startHour: z.number().int().min(OPEN_HOUR).max(CLOSE_HOUR - 1),
});

export async function bookTennisSlot(input: z.infer<typeof bookSchema>) {
  const user = await requireUser();
  const parsed = bookSchema.parse(input);
  const date = parseDateKey(parsed.dateKey);

  // block past slots
  const now = new Date();
  const slotStart = new Date(date);
  slotStart.setHours(parsed.startHour, 0, 0, 0);
  if (slotStart.getTime() < now.getTime()) {
    return { ok: false, error: "PAST_SLOT" as const };
  }

  try {
    await prisma.tennisBooking.create({
      data: {
        courtId: parsed.courtId,
        userId: user.id,
        date,
        startHour: parsed.startHour,
        status: "CONFIRMED",
      },
    });
    revalidatePath("/tennis");
    revalidatePath("/home");
    return { ok: true as const };
  } catch (e: any) {
    if (e.code === "P2002") return { ok: false, error: "SLOT_TAKEN" as const };
    throw e;
  }
}

const cancelSchema = z.object({ id: z.string().cuid() });

export async function cancelTennisBooking(input: z.infer<typeof cancelSchema>) {
  const user = await requireUser();
  const parsed = cancelSchema.parse(input);
  const booking = await prisma.tennisBooking.findUnique({
    where: { id: parsed.id },
  });
  if (!booking || booking.userId !== user.id) return { ok: false as const, error: "NOT_FOUND" as const };
  // Hard-delete so the slot frees up immediately.
  await prisma.tennisBooking.delete({ where: { id: parsed.id } });
  revalidatePath("/tennis");
  revalidatePath("/home");
  return { ok: true as const };
}

export const TENNIS_CONFIG = { OPEN_HOUR, CLOSE_HOUR };
