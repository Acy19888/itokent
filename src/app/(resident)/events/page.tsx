import Link from "next/link";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, Clock, Users } from "lucide-react";

export default async function EventsPage() {
  const t = await getTranslations("Events");
  const locale = await getLocale();

  const events = await prisma.event.findMany({
    where: { startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: { _count: { select: { attendees: true } } },
  });

  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-900">{t("title")}</h1>
        <p className="text-sm text-forest-600 mt-1">{t("subtitle")}</p>
      </header>

      {events.length === 0 ? (
        <div className="card-luxury p-8 text-center text-forest-500 text-sm">{t("noEvents")}</div>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.id}>
              <Link
                href={`/events/${e.id}`}
                className="card-luxury overflow-hidden block hover:shadow-md transition-shadow"
              >
                <div className="relative h-32 bg-gradient-forest">
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_40%,#c89236_0%,transparent_70%)]" />
                  <div className="absolute top-4 right-4 text-right">
                    <div className="bg-gradient-gold text-forest-950 rounded-xl px-3 py-2 shadow-lg">
                      <div className="text-[10px] uppercase tracking-wider font-semibold leading-none">
                        {new Intl.DateTimeFormat(locale, { month: "short" }).format(e.startsAt)}
                      </div>
                      <div className="text-2xl font-bold leading-tight">{e.startsAt.getDate()}</div>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-24">
                    <h3 className="font-display text-xl text-cream-50">
                      {locale === "tr" ? e.titleTr : e.titleEn}
                    </h3>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-sm text-forest-700 line-clamp-2">
                    {locale === "tr" ? e.descTr : e.descEn}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-forest-500 mt-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {dateFmt.format(e.startsAt)} · {timeFmt.format(e.startsAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {e.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {e._count.attendees} {t("attending")}
                    </span>
                    {e.feeAmount != null && e.feeAmount > 0 && (
                      <span className="flex items-center gap-1 text-gold-600 font-medium">
                        {(e.feeAmount / 100).toLocaleString(locale, {
                          style: "currency",
                          currency: e.feeCurrency ?? "TRY",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
