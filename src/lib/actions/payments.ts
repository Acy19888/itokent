"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────
// DUMMY PAYMENT FLOW
//
// This is intentionally NOT a real charge.  The form collects card-shape
// fields, we validate their *format* (Luhn + expiry) so the UX feels
// real, sleep briefly to mimic a bank handshake, then flip `paid=true`
// on the target row.  When we swap in a real PSP (most likely Iyzico)
// the DB shape does not change — only the body of the two pay* actions
// below.
// ─────────────────────────────────────────────────────────────────────

const cardSchema = z.object({
  holder: z.string().trim().min(2).max(60),
  // 13–19 digits after stripping spaces (covers every major BIN range).
  number: z
    .string()
    .transform((s) => s.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{13,19}$/)),
  // MM/YY
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/),
  cvc: z.string().regex(/^\d{3,4}$/),
});

function luhnOk(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = Number(num[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function expiryValid(expiry: string): boolean {
  const [mm, yy] = expiry.split("/").map(Number);
  const now = new Date();
  const century = Math.floor(now.getFullYear() / 100) * 100;
  const fullYear = century + yy;
  // End of the expiry month, inclusive.
  const endOfMonth = new Date(fullYear, mm, 0, 23, 59, 59);
  return endOfMonth.getTime() >= now.getTime();
}

async function validateCardShape(card: z.infer<typeof cardSchema>) {
  if (!luhnOk(card.number)) return "CARD_INVALID" as const;
  if (!expiryValid(card.expiry)) return "CARD_EXPIRED" as const;
  // Simulate network / 3DS round-trip so the UI gets a realistic feel.
  await new Promise((r) => setTimeout(r, 900));
  return "OK" as const;
}

// ─── Event attendance fee ────────────────────────────────────────────

const payEventSchema = z.object({
  eventId: z.string().min(1),
  card: cardSchema,
});

export async function payEventFee(input: z.infer<typeof payEventSchema>) {
  try {
    const user = await requireUser();
    const parsed = payEventSchema.parse(input);

    const status = await validateCardShape(parsed.card);
    if (status !== "OK") return { ok: false as const, error: status };

    const attendee = await prisma.eventAttendee.findUnique({
      where: {
        one_rsvp_per_user_per_event: {
          eventId: parsed.eventId,
          userId: user.id,
        },
      },
      include: { event: { select: { feeAmount: true } } },
    });
    if (!attendee) return { ok: false as const, error: "NO_RSVP" as const };
    if (!attendee.event.feeAmount || attendee.event.feeAmount <= 0) {
      return { ok: false as const, error: "FREE_EVENT" as const };
    }
    if (attendee.paid) return { ok: true as const, alreadyPaid: true };

    await prisma.eventAttendee.update({
      where: { id: attendee.id },
      data: { paid: true, paidAt: new Date() },
    });
    revalidatePath(`/events/${parsed.eventId}`);
    revalidatePath("/events");
    return { ok: true as const };
  } catch (e: any) {
    console.error("[payments.payEventFee]", e?.message);
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}

// ─── Party house rental fee ──────────────────────────────────────────

const payPartySchema = z.object({
  bookingId: z.string().min(1),
  card: cardSchema,
});

export async function payPartyFee(input: z.infer<typeof payPartySchema>) {
  try {
    const user = await requireUser();
    const parsed = payPartySchema.parse(input);

    const status = await validateCardShape(parsed.card);
    if (status !== "OK") return { ok: false as const, error: status };

    const booking = await prisma.partyHouseBooking.findUnique({
      where: { id: parsed.bookingId },
    });
    if (!booking || booking.userId !== user.id) {
      return { ok: false as const, error: "NOT_FOUND" as const };
    }
    if (booking.status !== "APPROVED") {
      return { ok: false as const, error: "NOT_APPROVED" as const };
    }
    if (!booking.feeAmount || booking.feeAmount <= 0) {
      return { ok: false as const, error: "NO_FEE" as const };
    }
    if (booking.paid) return { ok: true as const, alreadyPaid: true };

    await prisma.partyHouseBooking.update({
      where: { id: booking.id },
      data: { paid: true, paidAt: new Date() },
    });
    revalidatePath("/party-house");
    revalidatePath("/admin");
    return { ok: true as const };
  } catch (e: any) {
    console.error("[payments.payPartyFee]", e?.message);
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}
