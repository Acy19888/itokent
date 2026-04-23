import { prisma } from "@/lib/db";
import { getTranslations, getLocale } from "next-intl/server";
import { ResidentRow } from "./resident-row";

export default async function AdminResidents() {
  const t = await getTranslations("Admin");
  const locale = await getLocale();

  const residents = await prisma.user.findMany({
    where: { role: "RESIDENT" },
    include: {
      villa: true,
      _count: {
        select: {
          tennisBookings: true,
          restaurantRes: true,
          maintenanceTickets: true,
        },
      },
    },
    orderBy: [{ villa: { number: "asc" } }, { name: "asc" }],
  });

  const rows = residents.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    villaNumber: r.villa?.number ?? null,
    counts: {
      tennis: r._count.tennisBookings,
      restaurant: r._count.restaurantRes,
      tickets: r._count.maintenanceTickets,
    },
  }));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl text-forest-900">
          {t("tabs.residents")}
        </h1>
        <span className="text-sm text-forest-500">
          {residents.length} {locale === "tr" ? "sakin" : "residents"}
        </span>
      </header>

      <div className="card-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-forest-500 border-b border-forest-100 bg-cream-50/50">
                <th className="py-3 px-4">Villa</th>
                <th className="py-3 px-4">
                  {locale === "tr" ? "İsim" : "Name"}
                </th>
                <th className="py-3 px-4">
                  {locale === "tr" ? "E-posta" : "Email"}
                </th>
                <th className="py-3 px-4">
                  {locale === "tr" ? "Telefon" : "Phone"}
                </th>
                <th className="py-3 px-4 text-center">
                  {locale === "tr" ? "Tenis" : "Tennis"}
                </th>
                <th className="py-3 px-4 text-center">
                  {locale === "tr" ? "Restoran" : "Restaurant"}
                </th>
                <th className="py-3 px-4 text-center">
                  {locale === "tr" ? "Bakım" : "Tickets"}
                </th>
                <th className="py-3 px-4 text-right">
                  {locale === "tr" ? "İşlem" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forest-100">
              {rows.map((r) => (
                <ResidentRow key={r.id} resident={r} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
