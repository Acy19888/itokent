import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import {
  CalendarCheck, PartyPopper, UtensilsCrossed, Sparkles,
  UserPlus, Wrench, ArrowRight, ChevronRight,
} from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) return null;
  const t = await getTranslations("Home");
  const ann = await getTranslations("Announcements");
  const brand = await getTranslations("Brand");
  const locale = await getLocale();

  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [upcomingTennis, upcomingRest, upcomingParty, events, announcements] = await Promise.all([
    prisma.tennisBooking.findMany({
      where: {
        userId: session.user.id,
        status: "CONFIRMED",
        date: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      },
      include: { court: true },
      orderBy: [{ date: "asc" }, { startHour: "asc" }],
      take: 3,
    }),
    prisma.restaurantReservation.findMany({
      where: {
        userId: session.user.id,
        status: "CONFIRMED",
        date: { gte: now },
      },
      orderBy: { date: "asc" },
      take: 3,
    }),
    prisma.partyHouseBooking.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["PENDING", "APPROVED"] },
        date: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      },
      orderBy: { date: "asc" },
      take: 2,
    }),
    prisma.event.findMany({
      where: { startsAt: { gte: now, lte: in7 } },
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
    prisma.announcement.findMany({
      orderBy: { publishedAt: "desc" },
      take: 2,
    }),
  ]);

  const quickActions = [
    { href: "/tennis", label: t("bookTennis"), icon: CalendarCheck, tone: "itokent" },
    { href: "/restaurant", label: t("bookRestaurant"), icon: UtensilsCrossed, tone: "teal" },
    { href: "/party-house", label: t("bookParty"), icon: PartyPopper, tone: "itokent" },
    { href: "/events", label: t("viewEvents"), icon: Sparkles, tone: "brass" },
    { href: "/guests", label: t("addGuest"), icon: UserPlus, tone: "teal" },
    { href: "/maintenance", label: t("reportIssue"), icon: Wrench, tone: "itokent" },
  ] as const;

  const toneClass = (tone: "itokent" | "teal" | "brass") => {
    switch (tone) {
      case "itokent": return "bg-itokent-50 text-itokent-800 border-itokent-100";
      case "teal":    return "bg-teal-50 text-teal-800 border-teal-100";
      case "brass":   return "bg-brass-50 text-brass-800 border-brass-100";
    }
  };

  const fmt = new Intl.DateTimeFormat(locale, {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
  const fmtDate = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-10">
      {/* ─── Hero greeting ──────────────────────────────────────────── */}
      <section className="relative rounded-[2rem] overflow-hidden bg-itokent-canvas p-8 pt-9 text-ivory-50 shadow-edel-lg">
        {/* Soft teal wash */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-brass-400/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3" />

        {/* Hairline */}
        <span className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-brass-400/40 to-transparent" />

        <div className="relative">
          <p className="eyebrow-dark mb-3">{t("greeting")}</p>
          <h1 className="font-serif text-4xl font-medium text-ivory-50 leading-none">
            {session.user.name.split(" ")[0]}
          </h1>

          {session.user.villaNumber && (
            <div className="mt-5 flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-ivory-50/15 backdrop-blur-sm">
                <span className="text-[10px] uppercase tracking-widest-plus text-teal-200/90">
                  {t("villa")}
                </span>
                <span className="font-serif text-lg text-ivory-50 leading-none">
                  {String(session.user.villaNumber).padStart(3, "0")}
                </span>
              </div>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-ivory-50/10 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest-plus text-ivory-300/70">
              {brand("tagline")}
            </span>
            <span className="font-script text-xl text-teal-200/90 italic">
              {brand("suffix")}
            </span>
          </div>
        </div>
      </section>

      {/* ─── Quick actions ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-serif text-2xl font-medium text-itokent-900">{t("quickActions")}</h2>
          <span className="h-px flex-1 mx-4 bg-gradient-to-r from-ivory-300/60 to-transparent" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="group card-luxury p-5 min-h-[112px] flex flex-col justify-between
                           hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${toneClass(a.tone)}`}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-sm font-medium text-ink-800 leading-tight pr-2">{a.label}</span>
                  <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-itokent-700 group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── Upcoming ───────────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-serif text-2xl font-medium text-itokent-900">{t("upcoming")}</h2>
          <span className="h-px flex-1 mx-4 bg-gradient-to-r from-ivory-300/60 to-transparent" />
        </div>
        {upcomingTennis.length + upcomingRest.length + upcomingParty.length === 0 ? (
          <div className="card-luxury p-6 text-center text-ink-400 text-sm">
            {t("noUpcoming")}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {upcomingTennis.map((b) => (
              <li key={b.id} className="card-luxury p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-itokent-50 flex items-center justify-center border border-itokent-100">
                  <CalendarCheck className="w-5 h-5 text-itokent-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-800">
                    {b.court.name} · {String(b.startHour).padStart(2, "0")}:00–{String(b.startHour + 1).padStart(2, "0")}:00
                  </div>
                  <div className="text-xs text-ink-400 mt-0.5">{fmtDate.format(b.date)}</div>
                </div>
              </li>
            ))}
            {upcomingRest.map((b) => (
              <li key={b.id} className="card-luxury p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-teal-50 flex items-center justify-center border border-teal-100">
                  <UtensilsCrossed className="w-5 h-5 text-teal-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-800">
                    {fmt.format(b.date)} · {b.partySize} {locale === "tr" ? "kişi" : "guests"}
                  </div>
                  {b.notes && <div className="text-xs text-ink-400 mt-0.5 truncate">{b.notes}</div>}
                </div>
              </li>
            ))}
            {upcomingParty.map((b) => (
              <li key={b.id} className="card-luxury p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-brass-50 flex items-center justify-center border border-brass-100">
                  <PartyPopper className="w-5 h-5 text-brass-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-800 truncate">{b.occasion}</div>
                  <div className="text-xs text-ink-400 mt-0.5">
                    {fmtDate.format(b.date)}
                    <span className={"ml-2 badge " + (b.status === "APPROVED" ? "badge-approved" : b.status === "PENDING" ? "badge-pending" : "badge-rejected")}>
                      {b.status}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── News ───────────────────────────────────────────────────── */}
      {announcements.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-serif text-2xl font-medium text-itokent-900">{t("latestNews")}</h2>
            <Link href="/announcements" className="text-xs uppercase tracking-widest text-teal-700 hover:text-itokent-900 flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <ul className="space-y-2.5">
            {announcements.map((a) => (
              <li key={a.id} className="card-luxury p-5">
                <div className="mb-2">
                  <span className={
                    "badge " +
                    (a.priority === "URGENT" ? "badge-urgent" : a.priority === "HIGH" ? "badge-high" : "badge-normal")
                  }>
                    {ann(`priority.${a.priority as "NORMAL" | "HIGH" | "URGENT"}`)}
                  </span>
                </div>
                <h3 className="font-serif text-xl font-medium text-itokent-900 leading-tight">
                  {locale === "tr" ? a.titleTr : a.titleEn}
                </h3>
                <p className="mt-1.5 text-sm text-ink-500 leading-relaxed line-clamp-2">
                  {locale === "tr" ? a.bodyTr : a.bodyEn}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ─── Events this week ───────────────────────────────────────── */}
      {events.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-serif text-2xl font-medium text-itokent-900">{t("viewEvents")}</h2>
            <span className="h-px flex-1 mx-4 bg-gradient-to-r from-ivory-300/60 to-transparent" />
          </div>
          <ul className="space-y-2.5">
            {events.map((e) => (
              <li key={e.id} className="card-luxury p-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-itokent-50 border border-itokent-100 flex flex-col items-center justify-center text-itokent-800">
                    <span className="text-[10px] font-semibold uppercase leading-none tracking-wider">
                      {new Intl.DateTimeFormat(locale, { month: "short" }).format(e.startsAt)}
                    </span>
                    <span className="text-xl font-serif font-semibold leading-tight mt-0.5">{e.startsAt.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-lg font-medium text-itokent-900 leading-tight">
                      {locale === "tr" ? e.titleTr : e.titleEn}
                    </h3>
                    <p className="text-xs text-ink-400 mt-1 tracking-wide">
                      {e.location} · {new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(e.startsAt)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
