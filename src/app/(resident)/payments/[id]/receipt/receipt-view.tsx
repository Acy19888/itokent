"use client";

import { useTranslations } from "next-intl";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  payerName: string;
  title: string;
  sourceLabel: string;
  date: Date;
  paidAt: Date | null;
  feeAmount: number;
  feeCurrency: string;
  details: { label: string; value: string }[];
  receiptId: string;
  locale: string;
}

/** Print-optimized receipt view. Prose layout that prints to a clean A4. */
export function ReceiptView({
  payerName,
  title,
  sourceLabel,
  date,
  paidAt,
  feeAmount,
  feeCurrency,
  details,
  receiptId,
  locale,
}: Props) {
  const t = useTranslations("Payments");
  const dateStr = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const money = new Intl.NumberFormat(locale === "en" ? "en-GB" : "tr-TR", {
    style: "currency",
    currency: feeCurrency,
    minimumFractionDigits: 2,
  });
  // Stable, anonymized invoice id: short hash of the row id + timestamp.
  const shortId = receiptId.slice(-8).toUpperCase();
  const invoiceNo = `IT-${shortId}`;

  return (
    <div className="bg-white min-h-screen">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden bg-ivory-50 border-b border-ivory-200">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link
            href="/payments"
            className="inline-flex items-center gap-2 text-sm text-forest-700 hover:text-forest-900"
          >
            <ArrowLeft className="w-4 h-4" /> {t("backToPayments")}
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest-800 text-cream-50 hover:bg-forest-700 text-sm shadow-sm"
          >
            <Printer className="w-4 h-4" /> {t("printOrSave")}
          </button>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-8 py-12 print:py-0 print:px-10 text-ink-900">
        {/* Header */}
        <header className="flex items-start justify-between border-b border-ivory-300 pb-6 mb-8">
          <div>
            <div
              className="font-serif font-semibold tracking-logo text-2xl uppercase text-itokent-900"
              style={{ letterSpacing: "0.18em" }}
            >
              İtokent
            </div>
            <div className="font-script text-base text-teal-700 italic -mt-1">
              Urla
            </div>
            <div className="text-xs text-ink-500 mt-2">
              {t("communityPortal")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-ink-500">
              {t("receiptNumber")}
            </div>
            <div className="font-mono text-lg text-ink-900">{invoiceNo}</div>
            <div className="text-[10px] uppercase tracking-widest text-ink-500 mt-3">
              {t("issuedOn")}
            </div>
            <div className="text-sm text-ink-700">
              {dateStr.format(paidAt ?? new Date())}
            </div>
          </div>
        </header>

        {/* Bill-to + meta */}
        <section className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-500 mb-1">
              {t("billedTo")}
            </div>
            <div className="font-medium text-ink-900">{payerName}</div>
            {details.map((d) => (
              <div key={d.label} className="text-sm text-ink-700 mt-1">
                <span className="text-ink-500">{d.label}: </span>
                {d.value}
              </div>
            ))}
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-ink-500 mb-1">
              {t("status")}
            </div>
            <div className="inline-block px-3 py-1 rounded bg-forest-50 text-forest-800 text-xs uppercase tracking-wider">
              {t("paid")}
            </div>
          </div>
        </section>

        {/* Line items */}
        <section className="border border-ivory-300 rounded-lg overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead className="bg-ivory-100 text-ink-500 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left p-3">{t("description")}</th>
                <th className="text-left p-3">{t("date")}</th>
                <th className="text-right p-3">{t("amount")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3">
                  <div className="font-medium text-ink-900">{title}</div>
                  <div className="text-xs text-ink-500 mt-0.5">
                    {sourceLabel}
                  </div>
                </td>
                <td className="p-3 text-ink-700">{dateStr.format(date)}</td>
                <td className="p-3 text-right font-medium">
                  {money.format(feeAmount / 100)}
                </td>
              </tr>
            </tbody>
            <tfoot className="border-t border-ivory-300">
              <tr>
                <td className="p-3 text-right text-[10px] uppercase tracking-widest text-ink-500" colSpan={2}>
                  {t("total")}
                </td>
                <td className="p-3 text-right font-display text-xl text-itokent-900">
                  {money.format(feeAmount / 100)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Footer */}
        <footer className="text-xs text-ink-500 border-t border-ivory-300 pt-4 mt-12">
          <p>{t("thankYou")}</p>
          <p className="mt-2">
            {t("demoFooter")}
          </p>
        </footer>
      </article>
    </div>
  );
}
