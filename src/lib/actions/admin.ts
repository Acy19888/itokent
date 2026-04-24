"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

// ─── Party House approvals ────────────────────────────────────────────
// Admin approves a booking and may attach a rental fee.  The fee is
// passed in whole-TRY (e.g. 5000 for 5.000 TL) and stored in minor units.
export async function approveParty(id: string, feeTry?: number | null) {
  await requireRole("ADMIN");
  const feeAmount =
    feeTry != null && feeTry > 0 ? Math.round(feeTry * 100) : null;
  await prisma.partyHouseBooking.update({
    where: { id },
    data: {
      status: "APPROVED",
      feeAmount,
      feeCurrency: feeAmount != null ? "TRY" : null,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/party-house");
  return { ok: true as const };
}

/** Admin marks a party-house booking as paid manually (e.g. bank transfer). */
export async function markPartyPaid(id: string) {
  await requireRole("ADMIN");
  await prisma.partyHouseBooking.update({
    where: { id },
    data: { paid: true, paidAt: new Date() },
  });
  revalidatePath("/admin");
  revalidatePath("/party-house");
  return { ok: true as const };
}
export async function rejectParty(id: string) {
  await requireRole("ADMIN");
  await prisma.partyHouseBooking.update({ where: { id }, data: { status: "REJECTED" } });
  revalidatePath("/admin");
  revalidatePath("/party-house");
  return { ok: true as const };
}

// ─── Events ───────────────────────────────────────────────────────────
const eventSchema = z.object({
  titleTr: z.string().min(2).max(120),
  titleEn: z.string().min(2).max(120),
  descTr: z.string().min(2).max(2000),
  descEn: z.string().min(2).max(2000),
  location: z.string().min(2).max(120),
  startsAt: z.string(),
  endsAt: z.string(),
  // Optional attendance fee. The admin form collects whole-TRY numbers,
  // we convert to minor units (kuruş) when persisting.
  feeAmount: z.number().int().min(0).max(100_000_000).nullable().optional(),
  feeCurrency: z.string().length(3).optional(),
});

export async function createEvent(input: z.infer<typeof eventSchema>) {
  const user = await requireRole("ADMIN");
  const parsed = eventSchema.parse(input);
  await prisma.event.create({
    data: {
      titleTr: parsed.titleTr,
      titleEn: parsed.titleEn,
      descTr: parsed.descTr,
      descEn: parsed.descEn,
      location: parsed.location,
      startsAt: new Date(parsed.startsAt),
      endsAt: new Date(parsed.endsAt),
      feeAmount:
        parsed.feeAmount != null && parsed.feeAmount > 0
          ? parsed.feeAmount
          : null,
      feeCurrency: parsed.feeCurrency ?? "TRY",
      createdById: user.id,
    },
  });
  revalidatePath("/admin/events");
  revalidatePath("/events");
  return { ok: true as const };
}

export async function deleteEvent(id: string) {
  await requireRole("ADMIN");
  await prisma.event.delete({ where: { id } });
  revalidatePath("/admin/events");
  revalidatePath("/events");
  return { ok: true as const };
}

// ─── Announcements ────────────────────────────────────────────────────
const annSchema = z.object({
  titleTr: z.string().min(2).max(120),
  titleEn: z.string().min(2).max(120),
  bodyTr: z.string().min(2).max(5000),
  bodyEn: z.string().min(2).max(5000),
  priority: z.enum(["NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
});

export async function createAnnouncement(input: z.infer<typeof annSchema>) {
  const user = await requireRole("ADMIN");
  const parsed = annSchema.parse(input);
  await prisma.announcement.create({
    data: { ...parsed, authorId: user.id },
  });
  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  revalidatePath("/home");
  return { ok: true as const };
}

export async function deleteAnnouncement(id: string) {
  await requireRole("ADMIN");
  await prisma.announcement.delete({ where: { id } });
  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  return { ok: true as const };
}
