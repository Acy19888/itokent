import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { MaintenanceForm } from "./maintenance-form";

export default async function MaintenancePage() {
  const session = await auth();
  if (!session?.user) return null;
  const t = await getTranslations("Maintenance");
  const locale = await getLocale();

  const tickets = await prisma.maintenanceTicket.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const fmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(locale === "en" ? "en-GB" : "tr-TR", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount / 100);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-900">{t("title")}</h1>
        <p className="text-sm text-forest-600 mt-1">{t("subtitle")}</p>
      </header>

      <div className="card-luxury p-5">
        <h2 className="font-display text-xl text-forest-900 mb-4">{t("newTicket")}</h2>
        <MaintenanceForm />
      </div>

      <section>
        <h2 className="font-display text-xl text-forest-900 mb-3">{t("myTickets")}</h2>
        {tickets.length === 0 ? (
          <div className="card-luxury p-6 text-center text-forest-500 text-sm">{t("empty")}</div>
        ) : (
          <ul className="space-y-2">
            {tickets.map((tt) => {
              const hasFee = tt.feeAmount && tt.feeAmount > 0;
              // Once the work is done, the resident is invoiced. We open
              // the pay link as soon as the ticket is RESOLVED or CLOSED.
              const owesPayment =
                hasFee &&
                !tt.paid &&
                (tt.status === "RESOLVED" || tt.status === "CLOSED");
              return (
                <li key={tt.id} className="card-luxury p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-forest-500">
                      {t(
                        `categories.${tt.category as "ELECTRIC" | "PLUMBING" | "GARDEN" | "POOL" | "OTHER"}`,
                      )}{" "}
                      · {fmt.format(tt.createdAt)}
                    </span>
                    <span
                      className={
                        "badge " +
                        (tt.status === "RESOLVED" || tt.status === "CLOSED"
                          ? "badge-normal"
                          : tt.status === "IN_PROGRESS"
                          ? "badge-high"
                          : "badge-urgent")
                      }
                    >
                      {t(
                        `status.${tt.status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"}`,
                      )}
                    </span>
                  </div>
                  <h3 className="font-semibold text-forest-900">{tt.title}</h3>
                  <p className="mt-1 text-sm text-forest-600">{tt.description}</p>

                  {hasFee && (
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-ivory-200 pt-3">
                      <div className="text-xs text-forest-600">
                        <div className="text-[10px] uppercase tracking-wider text-forest-400">
                          {t("calloutFee")}
                        </div>
                        <div className="font-display text-base text-forest-900">
                          {money(tt.feeAmount!, tt.feeCurrency ?? "TRY")}
                        </div>
                      </div>
                      {tt.paid ? (
                        <div className="inline-flex items-center gap-1.5 text-xs text-forest-700">
                          <CheckCircle2 className="w-4 h-4" />
                          {t("paidOn")}{" "}
                          {tt.paidAt ? fmt.format(tt.paidAt) : ""}
                        </div>
                      ) : owesPayment ? (
                        <Link
                          href={`/maintenance/${tt.id}/checkout`}
                          className="btn-gold inline-flex items-center gap-1.5 text-xs px-3 py-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> {t("payNow")}
                        </Link>
                      ) : (
                        <span className="text-[11px] text-forest-500 italic">
                          {t("payAfterWork")}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
