"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { sendEmail, broadcastEmail } from "@/lib/email";

// ─── Broadcast helper ─────────────────────────────────────────────────
/**
 * Email every resident about a new event or announcement.
 *
 * Fire-and-forget by design: the admin's save must never be blocked by
 * email delivery. We limit concurrency to avoid swamping the Resend API,
 * and we log failures per-recipient rather than throwing.
 *
 * Respects per-user locale when composing the message.
 */
async function broadcastToResidents(args: {
  kind: "event" | "announcement";
  titleTr: string;
  titleEn: string;
  bodyTr: string;
  bodyEn: string;
  eventMeta?: {
    startsAt: Date;
    location: string;
    feeAmount: number | null;
    feeCurrency: string | null;
  };
}) {
  const residents = await prisma.user.findMany({
    where: { role: "RESIDENT" },
    select: { email: true, name: true, locale: true },
  });

  const targets = residents.filter((r) => !!r.email);
  const CONCURRENCY = 5;

  // Process in small chunks so one admin action can't blast hundreds of
  // concurrent fetches to the email API.
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const chunk = targets.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      chunk.map((r) => {
        const localeKey: "tr" | "en" = r.locale === "en" ? "en" : "tr";
        const title = localeKey === "en" ? args.titleEn : args.titleTr;
        const body = localeKey === "en" ? args.bodyEn : args.bodyTr;

        let feeDisplay: string | null = null;
        if (args.eventMeta?.feeAmount && args.eventMeta.feeAmount > 0) {
          try {
            feeDisplay = (args.eventMeta.feeAmount / 100).toLocaleString(
              localeKey === "en" ? "en-GB" : "tr-TR",
              {
                style: "currency",
                currency: args.eventMeta.feeCurrency ?? "TRY",
              },
            );
          } catch {
            feeDisplay = `${args.eventMeta.feeAmount / 100} ${
              args.eventMeta.feeCurrency ?? "TRY"
            }`;
          }
        }

        const { subject, html } = broadcastEmail({
          locale: localeKey,
          userName: r.name,
          kind: args.kind,
          title,
          body,
          eventMeta: args.eventMeta
            ? {
                startsAt: args.eventMeta.startsAt,
                location: args.eventMeta.location,
                feeDisplay,
              }
            : undefined,
        });
        return sendEmail({ to: r.email, subject, html }).catch((err) => {
          console.error(
            `[broadcast:${args.kind}] send failed for ${r.email}`,
            err?.message,
          );
        });
      }),
    );
  }
}

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
  const feeAmount =
    parsed.feeAmount != null && parsed.feeAmount > 0 ? parsed.feeAmount : null;
  const feeCurrency = parsed.feeCurrency ?? "TRY";

  const created = await prisma.event.create({
    data: {
      titleTr: parsed.titleTr,
      titleEn: parsed.titleEn,
      descTr: parsed.descTr,
      descEn: parsed.descEn,
      location: parsed.location,
      startsAt: new Date(parsed.startsAt),
      endsAt: new Date(parsed.endsAt),
      feeAmount,
      feeCurrency,
      createdById: user.id,
    },
  });

  // Fire-and-forget fan-out. Don't block the admin redirect on email.
  void broadcastToResidents({
    kind: "event",
    titleTr: parsed.titleTr,
    titleEn: parsed.titleEn,
    bodyTr: parsed.descTr,
    bodyEn: parsed.descEn,
    eventMeta: {
      startsAt: created.startsAt,
      location: created.location,
      feeAmount: created.feeAmount,
      feeCurrency: created.feeCurrency,
    },
  }).catch((err) => {
    console.error("[createEvent] broadcast failed", err?.message);
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

  // Fan-out broadcast to all residents. Non-blocking.
  void broadcastToResidents({
    kind: "announcement",
    titleTr: parsed.titleTr,
    titleEn: parsed.titleEn,
    bodyTr: parsed.bodyTr,
    bodyEn: parsed.bodyEn,
  }).catch((err) => {
    console.error("[createAnnouncement] broadcast failed", err?.message);
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
