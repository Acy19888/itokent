import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getLocale, getTranslations } from "next-intl/server";
import { startOfDay, addDays } from "@/lib/utils";
import { Users, CalendarCheck, Wrench, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const session = await auth();
  const t = await getTranslations("Admin");
  const locale = await getLocale();

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  const [
    residentCount,
    tennisToday,
    restaurantToday,
    partyPending,
    openTickets,
    upcomingEvents,
    recentAnnouncements,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "RESIDENT" } }),
    prisma.tennisBooking.count({
      where: { date: { gte: today, lt: tomorrow }, status: "CONFIRMED" },
    }),
    prisma.restaurantReservation.count({
      where: { date: { gte: today, lt: tomorrow }, status: "CONFIRMED" },
    }),
    prisma.partyHouseBooking.count({ where: { status: "PENDING" } }),
    prisma.maintenanceTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.event.count({ where: { startsAt: { gte: new Date() } } }),
    prisma.announcement.findMany({
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
  ]);

  const fmtDate = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl text-forest-900">{t("dashboard")}</h1>
        <p className="text-forest-600 mt-1">
          {t("welcome")}, {session?.user.name}
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label={t("stats.residents")}
          value={residentCount}
          accent="forest"
        />
        <StatCard
          icon={<CalendarCheck className="w-5 h-5" />}
          label={t("stats.todayBookings")}
          value={tennisToday + restaurantToday}
          hint={`${tennisToday} ${locale === "tr" ? "tenis" : "tennis"} · ${restaurantToday} ${locale === "tr" ? "restoran" : "rest"}`}
          accent="gold"
        />
        <StatCard
          icon={<Wrench className="w-5 h-5" />}
          label={t("stats.openTickets")}
          value={openTickets}
          accent="red"
        />
        <StatCard
          icon={<Sparkles className="w-5 h-5" />}
          label={t("stats.upcomingEvents")}
          value={upcomingEvents}
          accent="gold"
        />
      </div>

      {/* Quick links */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Link href="/admin/bookings" className="card-luxury p-5 hover:border-gold-300 transition">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-forest-400">
                {locale === "tr" ? "Parti Evi Talepleri" : "Party House Requests"}
              </div>
              <div className="font-display text-3xl text-forest-900 mt-1">{partyPending}</div>
              <div className="text-xs text-forest-500 mt-1">
                {locale === "tr" ? "onay bekliyor" : "pending approval"}
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-gold-500" />
          </div>
        </Link>

        <Link href="/admin/announcements" className="card-luxury p-5 hover:border-gold-300 transition">
          <div className="text-xs uppercase tracking-wider text-forest-400 mb-2">
            {t("tabs.announcements")}
          </div>
          {recentAnnouncements.length === 0 ? (
            <p className="text-sm text-forest-500">—</p>
          ) : (
            <ul className="space-y-1">
              {recentAnnouncements.map((a) => (
                <li key={a.id} className="text-sm text-forest-700 flex justify-between gap-2">
                  <span className="truncate">
                    {locale === "tr" ? a.titleTr : a.titleEn}
                  </span>
                  <span className="text-xs text-forest-400 shrink-0">
                    {fmtDate.format(a.publishedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, hint, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  accent: "forest" | "gold" | "red";
}) {
  const accents = {
    forest: "bg-forest-50 text-forest-700",
    gold: "bg-gold-50 text-gold-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className="card-luxury p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accents[accent]} mb-3`}>
        {icon}
      </div>
      <div className="text-xs uppercase tracking-wider text-forest-400">{label}</div>
      <div className="font-display text-3xl text-forest-900 mt-1">{value}</div>
      {hint && <div className="text-xs text-forest-500 mt-1">{hint}</div>}
    </div>
  );
}
