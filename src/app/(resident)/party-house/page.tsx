import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { PartyForm } from "./party-form";
import { addDays, startOfDay } from "@/lib/utils";

export default async function PartyHousePage() {
  const session = await auth();
  if (!session?.user) return null;
  const t = await getTranslations("PartyHouse");
  const locale = await getLocale();

  const today = startOfDay(new Date());
  const sixMonths = addDays(today, 180);

  const [taken, mine] = await Promise.all([
    prisma.partyHouseBooking.findMany({
      where: {
        status: { in: ["PENDING", "APPROVED"] },
        date: { gte: today, lte: sixMonths },
      },
      select: { date: true },
    }),
    prisma.partyHouseBooking.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ]);

  const fmt = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-900">{t("title")}</h1>
        <p className="text-sm text-forest-600 mt-1">{t("subtitle")}</p>
      </header>

      <div className="card-luxury p-5">
        <PartyForm
          takenDates={taken.map((t) => t.date.toISOString().slice(0, 10))}
        />
      </div>

      {mine.length > 0 && (
        <section>
          <h2 className="font-display text-xl text-forest-900 mb-3">{t("myRequests")}</h2>
          <ul className="space-y-2">
            {mine.map((b) => (
              <li key={b.id} className="card-luxury p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-forest-900">{b.occasion}</h3>
                    <p className="text-sm text-forest-600 mt-0.5">{fmt.format(b.date)}</p>
                    <p className="text-xs text-forest-500 mt-1">
                      {b.guestCount} {locale === "tr" ? "misafir" : "guests"}
                    </p>
                  </div>
                  <span className={
                    "badge " +
                    (b.status === "APPROVED" ? "badge-high" :
                     b.status === "REJECTED" || b.status === "CANCELLED" ? "badge-urgent" :
                     "badge-normal")
                  }>
                    {t(
                      b.status === "APPROVED" ? "approved" :
                      b.status === "REJECTED" ? "rejected" :
                      b.status === "CANCELLED" ? "cancelled" :
                      "pending"
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
