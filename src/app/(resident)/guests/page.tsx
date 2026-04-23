import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocale, getTranslations } from "next-intl/server";
import { GuestForm } from "./guest-form";
import { CheckCircle2, Clock } from "lucide-react";

export default async function GuestsPage() {
  const session = await auth();
  if (!session?.user) return null;
  const t = await getTranslations("Guests");
  const locale = await getLocale();

  const guests = await prisma.guest.findMany({
    where: { hostId: session.user.id },
    orderBy: { arrivesAt: "desc" },
    take: 20,
  });

  const fmt = new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-forest-900">{t("title")}</h1>
        <p className="text-sm text-forest-600 mt-1">{t("subtitle")}</p>
      </header>

      <div className="card-luxury p-5">
        <h2 className="font-display text-xl text-forest-900 mb-4">{t("add")}</h2>
        <GuestForm />
      </div>

      <section>
        <h2 className="font-display text-xl text-forest-900 mb-3">{t("myGuests")}</h2>
        {guests.length === 0 ? (
          <div className="card-luxury p-6 text-center text-forest-500 text-sm">{t("empty")}</div>
        ) : (
          <ul className="space-y-2">
            {guests.map((g) => (
              <li key={g.id} className="card-luxury p-4 flex items-center gap-3">
                <div className={
                  "w-10 h-10 rounded-full flex items-center justify-center " +
                  (g.checkedIn ? "bg-forest-100 text-forest-700" : "bg-gold-50 text-gold-700")
                }>
                  {g.checkedIn ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-forest-900">{g.name}</div>
                  <div className="text-xs text-forest-500">
                    {fmt.format(g.arrivesAt)} {g.plate ? `· ${g.plate}` : ""}
                  </div>
                </div>
                <span className={"badge " + (g.checkedIn ? "badge-normal" : "badge-high")}>
                  {g.checkedIn ? t("arrived") : t("pending")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
