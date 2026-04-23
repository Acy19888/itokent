import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { EventForm } from "./event-form";
import { DeleteEvent } from "./delete-event";

export default async function AdminEvents() {
  const t = await getTranslations("Admin");
  const locale = await getLocale();

  const events = await prisma.event.findMany({
    orderBy: { startsAt: "desc" },
    take: 50,
  });

  const fmt = new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl text-forest-900">{t("tabs.events")}</h1>
      </header>

      <div className="card-luxury p-5">
        <h2 className="font-display text-xl text-forest-900 mb-4">{t("createEvent")}</h2>
        <EventForm />
      </div>

      <section>
        <h2 className="font-display text-xl text-forest-900 mb-3">
          {locale === "tr" ? "Tüm Etkinlikler" : "All events"}
        </h2>
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="card-luxury p-4 flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-forest-900">
                  {locale === "tr" ? e.titleTr : e.titleEn}
                </div>
                <div className="text-xs text-forest-500 mt-0.5">
                  {fmt.format(e.startsAt)} · {e.location}
                </div>
              </div>
              <DeleteEvent id={e.id} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
