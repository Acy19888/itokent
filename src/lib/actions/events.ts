"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  sendEmail,
  eventRsvpEmail,
  eventRsvpCancelEmail,
} from "@/lib/email";

const idSchema = z.object({ eventId: z.string().min(1) });

/**
 * Toggle the current user's RSVP for an event.
 * - No row   → create one (and mark paid=false; for free events this is fine,
 *              for paid events the UI will then route to checkout before the
 *              event will honor the RSVP).
 * - Row exists → delete it (user changed their mind).
 *
 * Returns the resulting state so the client can update its toggle
 * without another round-trip. Fires fire-and-forget email on both
 * transitions (opt-in confirmation, opt-out cancellation).
 */
export async function toggleEventAttendance(
  input: z.infer<typeof idSchema>,
) {
  try {
    const user = await requireUser();
    const { eventId } = idSchema.parse(input);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      // We need title/location/startsAt for both the RSVP email and the
      // "needsPayment" decision.
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        location: true,
        titleTr: true,
        titleEn: true,
        feeAmount: true,
      },
    });
    if (!event) return { ok: false as const, error: "NOT_FOUND" as const };

    // Past events are read-only.
    if (event.startsAt.getTime() < Date.now()) {
      return { ok: false as const, error: "PAST" as const };
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true, locale: true },
    });
    const localeKey: "tr" | "en" = fullUser?.locale === "en" ? "en" : "tr";
    const title = localeKey === "en" ? event.titleEn : event.titleTr;

    const existing = await prisma.eventAttendee.findUnique({
      where: {
        one_rsvp_per_user_per_event: { eventId, userId: user.id },
      },
    });

    if (existing) {
      await prisma.eventAttendee.delete({ where: { id: existing.id } });

      if (fullUser?.email) {
        const { subject, html } = eventRsvpCancelEmail({
          locale: localeKey,
          userName: fullUser.name,
          eventTitle: title,
          startsAt: event.startsAt,
        });
        void sendEmail({ to: fullUser.email, subject, html }).catch((err) => {
          console.error("[events.toggle] cancel email failed", err?.message);
        });
      }

      revalidatePath(`/events/${eventId}`);
      revalidatePath("/events");
      revalidatePath("/home");
      return { ok: true as const, attending: false };
    }

    await prisma.eventAttendee.create({
      data: { eventId, userId: user.id },
    });

    const hasFee = event.feeAmount != null && event.feeAmount > 0;
    if (fullUser?.email) {
      const { subject, html } = eventRsvpEmail({
        locale: localeKey,
        userName: fullUser.name,
        eventTitle: title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: event.location,
        hasFee,
      });
      void sendEmail({ to: fullUser.email, subject, html }).catch((err) => {
        console.error("[events.toggle] rsvp email failed", err?.message);
      });
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/home");
    return {
      ok: true as const,
      attending: true,
      needsPayment: hasFee,
    };
  } catch (e: any) {
    console.error("[events.toggleAttendance]", e?.message);
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}
