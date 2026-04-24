import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Clock, MapPin, Users } from "lucide-react";
import { RsvpButton } from "./rsvp-button";

interface Props {
  params: { id: string };
}

export default async function EventDetailPage({ params }: Props) {
  const t = await getTranslations("Events");
  const locale = await getLocale();
  const session = await auth();

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { _count: { select: { attendees: true } } },
  });
  if (!event) notFound();

  // Is the current user attending?  Cheap separate query so we can render
  // the RSVP button with the right initial state.
  const mine = session?.user
    ? await prisma.eventAttendee.findUnique({
        where: {
          one_rsvp_per_user_per_event: {
            eventId: event.id,
            userId: session.user.id,
          },
        },
        select: { id: true, paid: true },
      })
    : null;

  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit", minute: "2-digit",
  });

  const title = locale === "tr" ? event.titleTr : event.titleEn;
  const desc = locale === "tr" ? event.descTr : event.descEn;
  const isPast = event.startsAt.getTime() < Date.now();
  const hasFee = event.feeAmount != null && event.feeAmount > 0;

  return (
    <div className="space-y-6">
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-sm text-forest-600 hover:text-forest-900"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("back")}
      </Link>

      <div className="card-luxury overflow-hidden">
        <div className="relative h-40 bg-gradient-forest">
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_40%,#c89236_0%,transparent_70%)]" />
          <div className="absolute top-4 right-4 text-right">
            <div className="bg-gradient-gold text-forest-950 rounded-xl px-3 py-2 shadow-lg">
              <div className="text-[10px] uppercase tracking-wider font-semibold leading-none">
                {new Intl.DateTimeFormat(locale, { month: "short" }).format(event.startsAt)}
              </div>
              <div className="text-2xl font-bold leading-tight">
                {event.startsAt.getDate()}
              </div>
            </div>
          </div>
          <div className="absolute bottom-4 left-4 right-24">
            <h1 className="font-display text-2xl text-cream-50">{title}</h1>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-forest-700 whitespace-pre-line">{desc}</p>

          <div className="grid gap-2 text-sm text-forest-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-forest-500" />
              {dateFmt.format(event.startsAt)} ·{" "}
              {timeFmt.format(event.startsAt)} – {timeFmt.format(event.endsAt)}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-forest-500" />
              {event.location}
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-forest-500" />
              {event._count.attendees} {t("attending")}
            </div>
            {hasFee && (
              <div className="flex items-center gap-2 text-gold-700 font-medium">
                {t("fee")}:{" "}
                {(event.feeAmount! / 100).toLocaleString(locale, {
                  style: "currency",
                  currency: event.feeCurrency ?? "TRY",
                })}
              </div>
            )}
          </div>

          {isPast ? (
            <div className="rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-sm text-forest-600">
              {t("pastEvent")}
            </div>
          ) : (
            <RsvpButton
              eventId={event.id}
              initialAttending={!!mine}
              initialPaid={!!mine?.paid}
              hasFee={hasFee}
              feeDisplay={
                hasFee
                  ? (event.feeAmount! / 100).toLocaleString(locale, {
                      style: "currency",
                      currency: event.feeCurrency ?? "TRY",
                    })
                  : null
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
