import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ReceiptView } from "./receipt-view";

interface Props {
  params: { id: string };
  searchParams: { type?: string };
}

/**
 * A printable HTML invoice for a single paid item. The user prints this
 * to PDF from their browser (Cmd+P → Save as PDF). Generating real PDFs
 * server-side would need either pdfkit or a chrome render — we keep it
 * simple here.
 */
export default async function ReceiptPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const t = await getTranslations("Payments");
  const locale = await getLocale();
  const type = (searchParams.type ?? "").toLowerCase();

  let row:
    | {
        title: string;
        date: Date;
        feeAmount: number;
        feeCurrency: string;
        paidAt: Date | null;
        sourceLabel: string;
        details: { label: string; value: string }[];
      }
    | null = null;

  // Use the same id schemes as the listing page.
  if (type === "party") {
    const p = await prisma.partyHouseBooking.findUnique({
      where: { id: params.id },
      include: { user: { include: { villa: true } } },
    });
    if (!p || p.userId !== session.user.id || !p.paid) return notFound();
    row = {
      title: p.occasion,
      date: p.date,
      feeAmount: p.feeAmount ?? 0,
      feeCurrency: p.feeCurrency ?? "TRY",
      paidAt: p.paidAt,
      sourceLabel: t("source.PARTY"),
      details: [
        { label: t("guestCount"), value: String(p.guestCount) },
        ...(p.user.villa
          ? [{ label: t("villa"), value: String(p.user.villa.number).padStart(3, "0") }]
          : []),
      ],
    };
  } else if (type === "event") {
    const a = await prisma.eventAttendee.findUnique({
      where: { id: params.id },
      include: {
        event: true,
        user: { include: { villa: true } },
      },
    });
    if (!a || a.userId !== session.user.id || !a.paid) return notFound();
    row = {
      title: locale === "tr" ? a.event.titleTr : a.event.titleEn,
      date: a.event.startsAt,
      feeAmount: a.event.feeAmount ?? 0,
      feeCurrency: a.event.feeCurrency ?? "TRY",
      paidAt: a.paidAt,
      sourceLabel: t("source.EVENT"),
      details: [
        { label: t("location"), value: a.event.location },
        ...(a.user.villa
          ? [{ label: t("villa"), value: String(a.user.villa.number).padStart(3, "0") }]
          : []),
      ],
    };
  } else if (type === "maintenance") {
    const m = await prisma.maintenanceTicket.findUnique({
      where: { id: params.id },
      include: { user: { include: { villa: true } } },
    });
    if (!m || m.userId !== session.user.id || !m.paid) return notFound();
    row = {
      title: m.title,
      date: m.createdAt,
      feeAmount: m.feeAmount ?? 0,
      feeCurrency: m.feeCurrency ?? "TRY",
      paidAt: m.paidAt,
      sourceLabel: t("source.MAINTENANCE"),
      details: [
        { label: t("category"), value: m.category },
        ...(m.user.villa
          ? [{ label: t("villa"), value: String(m.user.villa.number).padStart(3, "0") }]
          : []),
      ],
    };
  }

  if (!row) return notFound();

  return (
    <ReceiptView
      payerName={session.user.name}
      title={row.title}
      sourceLabel={row.sourceLabel}
      date={row.date}
      paidAt={row.paidAt}
      feeAmount={row.feeAmount}
      feeCurrency={row.feeCurrency}
      details={row.details}
      receiptId={params.id}
      locale={locale}
    />
  );
}
