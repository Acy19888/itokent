"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const idSchema = z.object({ eventId: z.string().min(1) });

/**
 * Toggle the current user's RSVP for an event.
 * - No row   → create one (and mark paid=false; for free events this is fine,
 *              for paid events the UI will then route to checkout before the
 *              event will honor the RSVP).
 * - Row exists → delete it (user changed their mind).
 *
 * Returns the resulting state so the client can update its toggle
 * without another round-trip.
 */
export async function toggleEventAttendance(
  input: z.infer<typeof idSchema>,
) {
  try {
    const user = await requireUser();
    const { eventId } = idSchema.parse(input);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, startsAt: true, feeAmount: true },
    });
    if (!event) return { ok: false as const, error: "NOT_FOUND" as const };

    // Past events are read-only.
    if (event.startsAt.getTime() < Date.now()) {
      return { ok: false as const, error: "PAST" as const };
    }

    const existing = await prisma.eventAttendee.findUnique({
      where: {
        one_rsvp_per_user_per_event: { eventId, userId: user.id },
      },
    });

    if (existing) {
      await prisma.eventAttendee.delete({ where: { id: existing.id } });
      revalidatePath(`/events/${eventId}`);
      revalidatePath("/events");
      revalidatePath("/home");
      return { ok: true as const, attending: false };
    }

    await prisma.eventAttendee.create({
      data: { eventId, userId: user.id },
    });
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/home");
    // Signal whether the UI should prompt for payment next.
    return {
      ok: true as const,
      attending: true,
      needsPayment: event.feeAmount != null && event.feeAmount > 0,
    };
  } catch (e: any) {
    console.error("[events.toggleAttendance]", e?.message);
    return { ok: false as const, error: "UNKNOWN" as const };
  }
}
