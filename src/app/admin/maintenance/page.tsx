import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { TicketActions } from "./ticket-actions";

export default async function AdminMaintenance() {
  const t = await getTranslations("Admin");
  const m = await getTranslations("Maintenance");
  const locale = await getLocale();

  const tickets = await prisma.maintenanceTicket.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { user: { include: { villa: true } } },
  });

  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-900">{t("tabs.maintenance")}</h1>
      </header>

      <ul className="space-y-3">
        {tickets.map((tk) => (
          <li key={tk.id} className="card-luxury p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-normal">
                    {m(`categories.${tk.category as "ELECTRIC" | "PLUMBING" | "GARDEN" | "POOL" | "OTHER"}`)}
                  </span>
                  <span className={
                    "badge " +
                    (tk.priority === "HIGH" ? "badge-urgent" : tk.priority === "NORMAL" ? "badge-high" : "badge-normal")
                  }>
                    {m(`priorities.${tk.priority as "LOW" | "NORMAL" | "HIGH"}`)}
                  </span>
                </div>
                <h3 className="mt-2 font-semibold text-forest-900">{tk.title}</h3>
                <p className="text-xs text-forest-500">
                  {tk.user.name}
                  {tk.user.villa && ` · Villa ${String(tk.user.villa.number).padStart(3, "0")}`}
                  {" · "}{fmt.format(tk.createdAt)}
                </p>
              </div>
              <span className={
                "badge shrink-0 " +
                (tk.status === "RESOLVED" || tk.status === "CLOSED" ? "badge-normal" :
                 tk.status === "IN_PROGRESS" ? "badge-high" : "badge-urgent")
              }>
                {m(`status.${tk.status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"}`)}
              </span>
            </div>
            <p className="text-sm text-forest-700 mb-3">{tk.description}</p>
            {(tk.status === "OPEN" || tk.status === "IN_PROGRESS") && (
              <TicketActions id={tk.id} status={tk.status as "OPEN" | "IN_PROGRESS"} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
