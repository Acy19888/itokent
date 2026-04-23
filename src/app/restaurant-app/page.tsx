import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { addDays, parseDateKey, startOfDay } from "@/lib/utils";
import { ReservationActions } from "./reservation-actions";

// Next.js 14: searchParams is a plain object, not a Promise.
export default async function RestaurantHome({
  searchParams,
}: {
  searchParams: { d?: string };
}) {
  const t = await getTranslations("RestaurantApp");
  const locale = await getLocale();
  const sp = searchParams ?? {};

  const today = startOfDay(new Date());
  const validDate = typeof sp.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d);
  const selected = validDate ? parseDateKey(sp.d as string) : today;
  const dayStart = startOfDay(selected);
  const dayEnd = addDays(dayStart, 1);

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const reservations = await prisma.restaurantReservation.findMany({
    where: {
      date: { gte: dayStart, lt: dayEnd },
      status: { not: "CANCELLED" },
    },
    include: { user: { include: { villa: true } } },
    orderBy: { date: "asc" },
  });

  const fmtTime = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  const fmtDay = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
  const fmtDayShort = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" });

  const totalGuests = reservations.reduce((sum, r) => sum + r.partySize, 0);
  const tablesInUse = new Set(reservations.map((r) => r.tableNumber)).size;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-cream-50">{t("todayReservations")}</h1>
        <p className="text-cream-300 text-sm mt-1">{fmtDay.format(selected)}</p>
      </header>

      {/* Date strip */}
      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 pb-2 min-w-max">
          {days.map((d) => {
            const key = d.toISOString().slice(0, 10);
            const active = key === selected.toISOString().slice(0, 10);
            return (
              <a
                key={key}
                href={`?d=${key}`}
                className={
                  "px-4 py-2 rounded-xl text-sm min-w-[80px] text-center transition " +
                  (active
                    ? "bg-gradient-gold text-forest-950 shadow-lg"
                    : "bg-forest-900/60 border border-gold-500/20 text-cream-300 hover:text-cream-50")
                }
              >
                {fmtDayShort.format(d)}
              </a>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label={locale === "tr" ? "Rezervasyon" : "Reservations"} value={reservations.length} />
        <StatCard label={locale === "tr" ? "Masa" : "Tables"} value={`${tablesInUse}/10`} />
        <StatCard label={locale === "tr" ? "Kişi" : "Guests"} value={`${totalGuests}/40`} />
        <StatCard label={locale === "tr" ? "Gelen" : "Arrived"} value={reservations.filter((r) => r.checkedIn).length} />
      </div>

      {/* Reservations list */}
      {reservations.length === 0 ? (
        <div className="text-center py-16 text-cream-400">{t("empty")}</div>
      ) : (
        <ul className="space-y-2">
          {reservations.map((r) => (
            <li
              key={r.id}
              className={
                "rounded-2xl p-4 border transition " +
                (r.checkedIn
                  ? "bg-forest-900/40 border-gold-500/30"
                  : r.status === "NO_SHOW"
                    ? "bg-forest-900/20 border-red-500/30 opacity-70"
                    : "bg-forest-900/60 border-gold-500/20 hover:border-gold-500/40")
              }
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-16 text-center">
                  <div className="font-display text-2xl text-gold-400">
                    {fmtTime.format(r.date)}
                  </div>
                  <div className="mt-1 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gold-400/10 border border-gold-500/30 font-display text-sm text-gold-300">
                    T{r.tableNumber}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-cream-50">{r.user.name}</span>
                    {r.user.villa && (
                      <span className="text-xs text-cream-400 font-mono">
                        #{String(r.user.villa.number).padStart(3, "0")}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-cream-300 mt-0.5">
                    {r.partySize} {t("partySize")}
                    {r.user.phone && ` · ${r.user.phone}`}
                  </div>
                  {r.notes && (
                    <div className="text-xs text-gold-300 mt-1 italic">
                      {t("notes")}: "{r.notes}"
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  {r.checkedIn ? (
                    <span className="inline-flex items-center gap-1 text-xs text-gold-400">
                      {t("checkedIn")}
                    </span>
                  ) : r.status === "NO_SHOW" ? (
                    <span className="badge badge-urgent">{t("noShow")}</span>
                  ) : (
                    <ReservationActions id={r.id} />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl bg-forest-900/60 border border-gold-500/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-cream-400">
        {label}
      </div>
      <div className="font-display text-2xl text-gold-400 mt-1">{value}</div>
    </div>
  );
}
