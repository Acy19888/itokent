import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getLocale, getTranslations } from "next-intl/server";
import { PartyCheckoutClient } from "./checkout-client";

interface Props {
  params: { id: string };
}

export default async function PartyCheckoutPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations("PartyHouse");
  const locale = await getLocale();

  const booking = await prisma.partyHouseBooking.findUnique({
    where: { id: params.id },
  });
  if (!booking) notFound();
  if (booking.userId !== session.user.id) redirect("/party-house");
  if (booking.status !== "APPROVED") redirect("/party-house");
  if (!booking.feeAmount || booking.feeAmount <= 0) redirect("/party-house");
  if (booking.paid) redirect("/party-house");

  const feeDisplay = (booking.feeAmount / 100).toLocaleString(locale, {
    style: "currency",
    currency: booking.feeCurrency ?? "TRY",
  });
  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-6 max-w-md">
      <Link
        href="/party-house"
        className="inline-flex items-center gap-1 text-sm text-forest-600 hover:text-forest-900"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("back")}
      </Link>

      <header>
        <h1 className="font-display text-2xl text-forest-900">
          {booking.occasion}
        </h1>
        <p className="text-sm text-forest-600 mt-1">{dateFmt.format(booking.date)}</p>
      </header>

      <div className="card-luxury p-5">
        <PartyCheckoutClient bookingId={booking.id} feeDisplay={feeDisplay} />
      </div>
    </div>
  );
}
