import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";

export default async function AnnouncementsPage() {
  const t = await getTranslations("Announcements");
  const locale = await getLocale();

  const items = await prisma.announcement.findMany({
    orderBy: { publishedAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-900">{t("title")}</h1>
        <p className="text-sm text-forest-600 mt-1">{t("subtitle")}</p>
      </header>

      {items.length === 0 ? (
        <div className="card-luxury p-6 text-center text-forest-500 text-sm">{t("empty")}</div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="card-luxury p-5">
              <div className="flex items-center justify-between mb-2">
                <span className={
                  "badge " +
                  (a.priority === "URGENT" ? "badge-urgent" : a.priority === "HIGH" ? "badge-high" : "badge-normal")
                }>
                  {t(`priority.${a.priority as "NORMAL" | "HIGH" | "URGENT"}`)}
                </span>
                <span className="text-xs text-forest-400">{fmt.format(a.publishedAt)}</span>
              </div>
              <h3 className="font-display text-xl text-forest-900 mb-2">
                {locale === "tr" ? a.titleTr : a.titleEn}
              </h3>
              <p className="text-sm text-forest-700 leading-relaxed whitespace-pre-line">
                {locale === "tr" ? a.bodyTr : a.bodyEn}
              </p>
              <p className="mt-3 text-xs text-forest-400">— {a.author.name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
