import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { startOfDay, addDays } from "@/lib/utils";
import { PartyActions } from "./party-actions";

export default async function AdminBookings() {
  const t = await getTranslations("Admin");
  const locale = await getLocale();

  const today = startOfDay(new Date());
  const nextWeek = addDays(today, 14);

  const [tennis, restaurant, party] = await Promise.all([
    prisma.tennisBooking.findMany({
      where: { date: { gte: today, lte: nextWeek }, status: "CONFIRMED" },
      include: { user: true, court: true },
      orderBy: [{ date: "asc" }, { startHour: "asc" }],
    }),
    prisma.restaurantReservation.findMany({
      where: { date: { gte: today, lte: nextWeek }, status: "CONFIRMED" },
      include: { user: true },
      orderBy: { date: "asc" },
    }),
    prisma.partyHouseBooking.findMany({
      where: { status: { in: ["PENDING", "APPROVED"] } },
      include: { user: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const dayFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", weekday: "short" });
  const timeFmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl text-forest-900">{t("tabs.bookings")}</h1>
      </header>

      <Section title={locale === "tr" ? "Parti Evi Talepleri" : "Party House Requests"}>
        {party.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-2">
            {party.map((b) => (
              <div key={b.id} className="card-luxury p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-forest-900">{b.occasion}</div>
                    <div className="text-sm text-forest-600 mt-0.5">
                      {dayFmt.format(b.date)} · {b.guestCount} {locale === "tr" ? "misafir" : "guests"}
                    </div>
                    <div className="text-xs text-forest-500 mt-1">
                      {b.user.name}
                    </div>
                    {b.notes && <div className="text-xs text-forest-500 mt-2 italic">"{b.notes}"</div>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={"badge " + (b.status === "APPROVED" ? "badge-high" : "badge-normal")}>
                      {b.status}
                    </span>
                    {b.feeAmount != null && b.feeAmount > 0 && (
                      <span className={
                        "text-xs font-medium " +
                        (b.paid ? "text-forest-600" : "text-gold-700")
                      }>
                        {(b.feeAmount / 100).toLocaleString(locale, {
                          style: "currency",
                          currency: b.feeCurrency ?? "TRY",
                        })}
                        {b.paid ? ` · ${locale === "tr" ? "ödendi" : "paid"}` : ""}
                      </span>
                    )}
                    <PartyActions
                      id={b.id}
                      status={b.status}
                      existingFee={b.feeAmount}
                      paid={b.paid}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={locale === "tr" ? "Tenis Rezervasyonları (14 gün)" : "Tennis bookings (14 days)"}>
        {tennis.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto -mx-4 lg:mx-0">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-forest-500 border-b border-forest-100">
                  <th className="py-2 px-4">{locale === "tr" ? "Tarih" : "Date"}</th>
                  <th className="py-2 px-4">{locale === "tr" ? "Kort" : "Court"}</th>
                  <th className="py-2 px-4">{locale === "tr" ? "Saat" : "Time"}</th>
                  <th className="py-2 px-4">{locale === "tr" ? "Sakin" : "Resident"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-100">
                {tennis.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2 px-4">{dayFmt.format(b.date)}</td>
                    <td className="py-2 px-4">{b.court.name}</td>
                    <td className="py-2 px-4">
                      {String(b.startHour).padStart(2, "0")}:00 – {String(b.startHour + 1).padStart(2, "0")}:00
                    </td>
                    <td className="py-2 px-4">{b.user.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={locale === "tr" ? "Restoran Rezervasyonları (14 gün)" : "Restaurant reservations (14 days)"}>
        {restaurant.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto -mx-4 lg:mx-0">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-forest-500 border-b border-forest-100">
                  <th className="py-2 px-4">{locale === "tr" ? "Tarih" : "Date"}</th>
                  <th className="py-2 px-4">{locale === "tr" ? "Saat" : "Time"}</th>
                  <th className="py-2 px-4">{locale === "tr" ? "Kişi" : "Guests"}</th>
                  <th className="py-2 px-4">{locale === "tr" ? "Sakin" : "Resident"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-100">
                {restaurant.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2 px-4">{dayFmt.format(b.date)}</td>
                    <td className="py-2 px-4">{timeFmt.format(b.date)}</td>
                    <td className="py-2 px-4">{b.partySize}</td>
                    <td className="py-2 px-4">{b.user.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl text-forest-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Empty() {
  return <div className="card-luxury p-6 text-center text-forest-500 text-sm">—</div>;
}
