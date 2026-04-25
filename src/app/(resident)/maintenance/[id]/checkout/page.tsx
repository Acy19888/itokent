import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getLocale, getTranslations } from "next-intl/server";
import { MaintenanceCheckoutClient } from "./checkout-client";

interface Props {
  params: { id: string };
}

export default async function MaintenanceCheckoutPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations("Maintenance");
  const locale = await getLocale();

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: params.id },
  });
  if (!ticket) notFound();
  if (ticket.userId !== session.user.id) redirect("/maintenance");
  if (!ticket.feeAmount || ticket.feeAmount <= 0) redirect("/maintenance");
  if (ticket.paid) redirect("/maintenance");

  const feeDisplay = (ticket.feeAmount / 100).toLocaleString(locale, {
    style: "currency",
    currency: ticket.feeCurrency ?? "TRY",
  });

  return (
    <div className="space-y-6 max-w-md">
      <Link
        href="/maintenance"
        className="inline-flex items-center gap-1 text-sm text-forest-600 hover:text-forest-900"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("back")}
      </Link>

      <header>
        <h1 className="font-display text-2xl text-forest-900">
          {ticket.title}
        </h1>
        <p className="text-sm text-forest-600 mt-1">
          {t(
            `categories.${ticket.category as "ELECTRIC" | "PLUMBING" | "GARDEN" | "POOL" | "OTHER"}`,
          )}
        </p>
      </header>

      <div className="card-luxury p-5">
        <MaintenanceCheckoutClient
          ticketId={ticket.id}
          feeDisplay={feeDisplay}
        />
      </div>
    </div>
  );
}
