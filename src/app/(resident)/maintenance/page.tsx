import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
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

  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

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
            {tickets.map((tt) => (
              <li key={tt.id} className="card-luxury p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-forest-500">
                    {t(`categories.${tt.category as "ELECTRIC" | "PLUMBING" | "GARDEN" | "POOL" | "OTHER"}`)} · {fmt.format(tt.createdAt)}
                  </span>
                  <span className={
                    "badge " +
                    (tt.status === "RESOLVED" || tt.status === "CLOSED" ? "badge-normal" :
                     tt.status === "IN_PROGRESS" ? "badge-high" : "badge-urgent")
                  }>
                    {t(`status.${tt.status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"}`)}
                  </span>
                </div>
                <h3 className="font-semibold text-forest-900">{tt.title}</h3>
                <p className="mt-1 text-sm text-forest-600">{tt.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
