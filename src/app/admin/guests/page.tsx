import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckInGuest } from "./check-in";

export default async function AdminGuests() {
  const t = await getTranslations("Admin");
  const locale = await getLocale();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const [todays, upcoming] = await Promise.all([
    prisma.guest.findMany({
      where: { arrivesAt: { gte: today, lt: tomorrow } },
      include: { host: { include: { villa: true } } },
      orderBy: { arrivesAt: "asc" },
    }),
    prisma.guest.findMany({
      where: { arrivesAt: { gte: tomorrow } },
      include: { host: { include: { villa: true } } },
      orderBy: { arrivesAt: "asc" },
      take: 50,
    }),
  ]);

  const fmt = new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl text-forest-900">{t("tabs.guests")}</h1>
      </header>

      <section>
        <h2 className="font-display text-xl text-forest-900 mb-3">
          {locale === "tr" ? "Bugün" : "Today"} ({todays.length})
        </h2>
        <GuestList guests={todays} fmt={fmt} locale={locale} showCheckIn />
      </section>

      <section>
        <h2 className="font-display text-xl text-forest-900 mb-3">
          {locale === "tr" ? "Yaklaşan" : "Upcoming"}
        </h2>
        <GuestList guests={upcoming} fmt={fmt} locale={locale} />
      </section>
    </div>
  );
}

function GuestList({
  guests, fmt, locale, showCheckIn,
}: {
  guests: any[];
  fmt: Intl.DateTimeFormat;
  locale: string;
  showCheckIn?: boolean;
}) {
  if (guests.length === 0) {
    return <div className="card-luxury p-5 text-center text-forest-500 text-sm">—</div>;
  }
  return (
    <ul className="space-y-2">
      {guests.map((g) => (
        <li key={g.id} className="card-luxury p-4 flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-forest-900">{g.name}</div>
            <div className="text-xs text-forest-500 mt-0.5">
              {fmt.format(g.arrivesAt)} · {g.host.name}
              {g.host.villa && ` · Villa ${String(g.host.villa.number).padStart(3, "0")}`}
              {g.plate && ` · ${g.plate}`}
            </div>
            {g.purpose && <div className="text-xs text-forest-500 italic mt-1">"{g.purpose}"</div>}
          </div>
          {showCheckIn && !g.checkedIn && <CheckInGuest id={g.id} />}
          {g.checkedIn && (
            <span className="badge badge-normal">
              {locale === "tr" ? "Geldi" : "Arrived"}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
