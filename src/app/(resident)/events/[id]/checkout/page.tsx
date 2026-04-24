import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckoutClient } from "./checkout-client";

interface Props {
  params: { id: string };
}

export default async function EventCheckoutPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations("Events");
  const locale = await getLocale();

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) notFound();

  // Only residents who've already RSVP'd can pay (pay button is hidden
  // elsewhere anyway, but guard here too).
  const attendee = await prisma.eventAttendee.findUnique({
    where: {
      one_rsvp_per_user_per_event: {
        eventId: event.id,
        userId: session.user.id,
      },
    },
  });
  if (!attendee) redirect(`/events/${event.id}`);
  if (!event.feeAmount || event.feeAmount <= 0) redirect(`/events/${event.id}`);
  if (attendee.paid) redirect(`/events/${event.id}`);

  const feeDisplay = (event.feeAmount / 100).toLocaleString(locale, {
    style: "currency",
    currency: event.feeCurrency ?? "TRY",
  });

  return (
    <div className="space-y-6 max-w-md">
      <Link
        href={`/events/${event.id}`}
        className="inline-flex items-center gap-1 text-sm text-forest-600 hover:text-forest-900"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("back")}
      </Link>

      <header>
        <h1 className="font-display text-2xl text-forest-900">
          {locale === "tr" ? event.titleTr : event.titleEn}
        </h1>
        <p className="text-sm text-forest-600 mt-1">
          {event.location}
        </p>
      </header>

      <div className="card-luxury p-5">
        <CheckoutClient eventId={event.id} feeDisplay={feeDisplay} />
      </div>
    </div>
  );
}
