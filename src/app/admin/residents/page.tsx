import { prisma } from "@/lib/db";
import { getTranslations, getLocale } from "next-intl/server";

export default async function AdminResidents() {
  const t = await getTranslations("Admin");
  const locale = await getLocale();

  const residents = await prisma.user.findMany({
    where: { role: "RESIDENT" },
    include: { villa: true, _count: { select: { tennisBookings: true, restaurantRes: true, maintenanceTickets: true } } },
    orderBy: [{ villa: { number: "asc" } }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl text-forest-900">{t("tabs.residents")}</h1>
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
                <th className="py-3 px-4">{locale === "tr" ? "İsim" : "Name"}</th>
                <th className="py-3 px-4">{locale === "tr" ? "E-posta" : "Email"}</th>
                <th className="py-3 px-4">{locale === "tr" ? "Telefon" : "Phone"}</th>
                <th className="py-3 px-4 text-center">{locale === "tr" ? "Tenis" : "Tennis"}</th>
                <th className="py-3 px-4 text-center">{locale === "tr" ? "Restoran" : "Restaurant"}</th>
                <th className="py-3 px-4 text-center">{locale === "tr" ? "Bakım" : "Tickets"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forest-100">
              {residents.map((r) => (
                <tr key={r.id} className="hover:bg-cream-50/30">
                  <td className="py-2.5 px-4 font-mono text-forest-600">
                    {r.villa ? String(r.villa.number).padStart(3, "0") : "—"}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-forest-900">{r.name}</td>
                  <td className="py-2.5 px-4 text-forest-600">{r.email}</td>
                  <td className="py-2.5 px-4 text-forest-600">{r.phone || "—"}</td>
                  <td className="py-2.5 px-4 text-center text-forest-600">{r._count.tennisBookings}</td>
                  <td className="py-2.5 px-4 text-center text-forest-600">{r._count.restaurantRes}</td>
                  <td className="py-2.5 px-4 text-center text-forest-600">{r._count.maintenanceTickets}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
