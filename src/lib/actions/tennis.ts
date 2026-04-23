"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseDateKey } from "@/lib/utils";
import { sendEmail, tennisConfirmationEmail } from "@/lib/email";

const OPEN_HOUR = 9;   // 9:00 AM first slot
const CLOSE_HOUR = 20; // last slot starts at 19:00

const bookSchema = z.object({
  // Prisma's default cuid() may be cuid v2 under newer runtimes; keep this
  // permissive so valid IDs from our own DB never get rejected.
  courtId: z.string().min(1),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startHour: z.number().int().min(OPEN_HOUR).max(CLOSE_HOUR - 1),
});

export async function bookTennisSlot(input: z.infer<typeof bookSchema>) {
  try {
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
      // Create booking + fetch user/court info in parallel (court lookup is
      // needed for the confirmation email; cheap even if it fails).
      const [booking, fullUser, court] = await Promise.all([
        prisma.tennisBooking.create({
          data: {
            courtId: parsed.courtId,
            userId: user.id,
            date,
            startHour: parsed.startHour,
            status: "CONFIRMED",
          },
        }),
        prisma.user.findUnique({
          where: { id: user.id },
          select: { email: true, name: true, locale: true },
        }),
        prisma.tennisCourt.findUnique({
          where: { id: parsed.courtId },
          select: { name: true },
        }),
      ]);

      // Fire-and-forget confirmation email. Do NOT block the booking on this:
      // an email failure (misconfigured Resend, bad address, etc.) must not
      // roll back a successful reservation.
      if (fullUser?.email && court?.name) {
        const { subject, html } = tennisConfirmationEmail({
          locale: fullUser.locale === "en" ? "en" : "tr",
          userName: fullUser.name,
          courtName: court.name,
          dateKey: parsed.dateKey,
          startHour: parsed.startHour,
        });
        void sendEmail({ to: fullUser.email, subject, html }).catch((err) => {
          console.error("[tennis.book] email dispatch failed", err?.message);
        });
      }

      revalidatePath("/tennis");
      revalidatePath("/home");
      return { ok: true as const, bookingId: booking.id };
    } catch (e: any) {
      if (e.code === "P2002") return { ok: false, error: "SLOT_TAKEN" as const };
      console.error("[tennis.book] prisma error", { code: e?.code, message: e?.message });
      return { ok: false, error: "UNKNOWN" as const };
    }
  } catch (e: any) {
    console.error("[tennis.book] fatal", { message: e?.message, stack: e?.stack });
    return { ok: false, error: "UNKNOWN" as const };
  }
}

const cancelSchema = z.object({ id: z.string().min(1) });

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

// NOTE: Do not add non-async exports here. Files with "use server" are compiled
// into server-action bundles and may only export async functions.
