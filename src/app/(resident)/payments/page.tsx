import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  PartyPopper,
  Sparkles,
  Wrench,
  Receipt,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface PaymentRow {
  id: string;
  source: "PARTY" | "EVENT" | "MAINTENANCE";
  title: string;
  date: Date;
  feeAmount: number;
  feeCurrency: string;
  paid: boolean;
  paidAt: Date | null;
  detailHref: string;
  receiptHref?: string;
}

function formatMoney(amount: number, currency: string, locale: string) {
  // Stored in MINOR units (kuruş for TRY).
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export default async function PaymentsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const t = await getTranslations("Payments");
  const locale = await getLocale();

  const userId = session.user.id;

  // Pull all fee-bearing rows that belong to this user, in parallel.
  const [parties, eventRsvps, tickets] = await Promise.all([
    prisma.partyHouseBooking.findMany({
      where: {
        userId,
        feeAmount: { not: null, gt: 0 },
        status: { in: ["APPROVED"] },
      },
      orderBy: { date: "desc" },
    }),
    prisma.eventAttendee.findMany({
      where: { userId, event: { feeAmount: { not: null, gt: 0 } } },
      include: {
        event: {
          select: { id: true, titleTr: true, titleEn: true, startsAt: true, feeAmount: true, feeCurrency: true },
        },
      },
    }),
    prisma.maintenanceTicket.findMany({
      where: { userId, feeAmount: { not: null, gt: 0 } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rows: PaymentRow[] = [];

  for (const p of parties) {
    rows.push({
      id: `party-${p.id}`,
      source: "PARTY",
      title: p.occasion,
      date: p.date,
      feeAmount: p.feeAmount!,
      feeCurrency: p.feeCurrency ?? "TRY",
      paid: p.paid,
      paidAt: p.paidAt,
      detailHref: "/party-house",
      receiptHref: p.paid ? `/payments/${p.id}/receipt?type=party` : undefined,
    });
  }

  for (const a of eventRsvps) {
    rows.push({
      id: `event-${a.id}`,
      source: "EVENT",
      title: locale === "tr" ? a.event.titleTr : a.event.titleEn,
      date: a.event.startsAt,
      feeAmount: a.event.feeAmount!,
      feeCurrency: a.event.feeCurrency ?? "TRY",
      paid: a.paid,
      paidAt: a.paidAt,
      detailHref: `/events/${a.event.id}`,
      receiptHref: a.paid ? `/payments/${a.id}/receipt?type=event` : undefined,
    });
  }

  for (const m of tickets) {
    // Only let the user check out once the work has been resolved/closed —
    // we don't want pre-paid maintenance with no associated visit.
    const checkoutReady = m.status === "RESOLVED" || m.status === "CLOSED";
    rows.push({
      id: `maint-${m.id}`,
      source: "MAINTENANCE",
      title: m.title,
      date: m.createdAt,
      feeAmount: m.feeAmount!,
      feeCurrency: m.feeCurrency ?? "TRY",
      paid: m.paid,
      paidAt: m.paidAt,
      detailHref: checkoutReady ? `/maintenance/${m.id}/checkout` : "/maintenance",
      receiptHref: m.paid ? `/payments/${m.id}/receipt?type=maintenance` : undefined,
    });
  }

  // Newest first.
  rows.sort((a, b) => b.date.getTime() - a.date.getTime());

  const totalPaid = rows
    .filter((r) => r.paid)
    .reduce((s, r) => s + r.feeAmount, 0);
  const totalOpen = rows
    .filter((r) => !r.paid)
    .reduce((s, r) => s + r.feeAmount, 0);

  const fmtDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-900">{t("title")}</h1>
        <p className="text-sm text-forest-600 mt-1">{t("subtitle")}</p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label={t("totalPaid")}
          value={formatMoney(totalPaid, "TRY", locale)}
          tone="paid"
        />
        <SummaryCard
          icon={<Clock className="w-4 h-4" />}
          label={t("totalOpen")}
          value={formatMoney(totalOpen, "TRY", locale)}
          tone="open"
        />
      </div>

      {rows.length === 0 ? (
        <div className="card-luxury p-8 text-center text-forest-500 text-sm">
          {t("empty")}
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="card-luxury p-4 flex items-center gap-3"
            >
              <SourceIcon source={r.source} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-forest-900 truncate">
                    {r.title}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-forest-400 shrink-0">
                    {t(`source.${r.source}`)}
                  </span>
                </div>
                <div className="text-xs text-forest-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{fmtDate.format(r.date)}</span>
                  {r.paid && r.paidAt && (
                    <>
                      <span>·</span>
                      <span>
                        {t("paidOn")} {fmtDate.format(r.paidAt)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-display text-lg text-forest-900">
                  {formatMoney(r.feeAmount, r.feeCurrency, locale)}
                </span>
                {r.paid ? (
                  <div className="flex items-center gap-2">
                    <span className="badge badge-high">{t("paid")}</span>
                    {r.receiptHref && (
                      <Link
                        href={r.receiptHref}
                        target="_blank"
                        className="text-[11px] text-forest-600 hover:text-gold-600 inline-flex items-center gap-1 underline-offset-2 hover:underline"
                      >
                        <Receipt className="w-3 h-3" /> {t("receipt")}
                      </Link>
                    )}
                  </div>
                ) : (
                  <Link
                    href={r.detailHref}
                    className="text-xs text-gold-700 hover:text-gold-800 underline-offset-2 hover:underline"
                  >
                    {t("payNow")} →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "paid" | "open";
}) {
  return (
    <div className="card-luxury p-4">
      <div
        className={
          "inline-flex items-center gap-1 text-[10px] uppercase tracking-wider " +
          (tone === "paid" ? "text-forest-600" : "text-gold-700")
        }
      >
        {icon}
        {label}
      </div>
      <div className="font-display text-2xl text-forest-900 mt-1">{value}</div>
    </div>
  );
}

function SourceIcon({ source }: { source: PaymentRow["source"] }) {
  const Map = {
    PARTY: { Icon: PartyPopper, bg: "bg-forest-50", color: "text-forest-700" },
    EVENT: { Icon: Sparkles, bg: "bg-gold-50", color: "text-gold-700" },
    MAINTENANCE: { Icon: Wrench, bg: "bg-red-50", color: "text-red-700" },
  } as const;
  const { Icon, bg, color } = Map[source];
  return (
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg} ${color}`}
    >
      <Icon className="w-5 h-5" />
    </div>
  );
}
