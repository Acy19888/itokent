import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { AnnouncementForm } from "./announcement-form";
import { DeleteAnnouncement } from "./delete-announcement";

export default async function AdminAnnouncements() {
  const t = await getTranslations("Admin");
  const ann = await getTranslations("Announcements");
  const locale = await getLocale();

  const items = await prisma.announcement.findMany({
    orderBy: { publishedAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl text-forest-900">{t("tabs.announcements")}</h1>
      </header>

      <div className="card-luxury p-5">
        <h2 className="font-display text-xl text-forest-900 mb-4">{t("createAnnouncement")}</h2>
        <AnnouncementForm />
      </div>

      <section>
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="card-luxury p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={
                      "badge " +
                      (a.priority === "URGENT" ? "badge-urgent" : a.priority === "HIGH" ? "badge-high" : "badge-normal")
                    }>
                      {ann(`priority.${a.priority as "NORMAL" | "HIGH" | "URGENT"}`)}
                    </span>
                    <span className="text-xs text-forest-400">{fmt.format(a.publishedAt)}</span>
                  </div>
                  <h3 className="font-semibold text-forest-900">
                    {locale === "tr" ? a.titleTr : a.titleEn}
                  </h3>
                  <p className="mt-1 text-sm text-forest-600 line-clamp-3">
                    {locale === "tr" ? a.bodyTr : a.bodyEn}
                  </p>
                </div>
                <DeleteAnnouncement id={a.id} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
