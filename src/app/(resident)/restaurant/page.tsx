import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { RestaurantForm } from "./restaurant-form";

export default async function RestaurantPage() {
  const session = await auth();
  if (!session?.user) return null;
  const t = await getTranslations("Restaurant");
  const locale = await getLocale();

  const mine = await prisma.restaurantReservation.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 10,
  });

  const fmt = new Intl.DateTimeFormat(locale, {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-900">{t("title")}</h1>
        <p className="text-sm text-forest-600 mt-1">{t("subtitle")}</p>
      </header>

      <div className="card-luxury p-5">
        <RestaurantForm />
      </div>

      {mine.length > 0 && (
        <section>
          <h2 className="font-display text-xl text-forest-900 mb-3">{t("myReservations")}</h2>
          <ul className="space-y-2">
            {mine.map((r) => (
              <li key={r.id} className="card-luxury p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-forest-900">{fmt.format(r.date)}</div>
                  <div className="text-xs text-forest-500 mt-0.5">
                    {r.partySize} {locale === "tr" ? "kişi" : "guests"}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </div>
                </div>
                <span className={
                  "badge " + (r.status === "CONFIRMED" ? "badge-high" : "badge-normal")
                }>
                  {r.status === "CANCELLED" ? t("cancelled") : "OK"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
