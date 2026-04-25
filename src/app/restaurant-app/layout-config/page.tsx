import { prisma } from "@/lib/db";
import { LayoutEditor } from "./layout-editor";
import { getTranslations } from "next-intl/server";

export default async function LayoutConfigPage() {
  const t = await getTranslations("RestaurantApp");
  const tables = await prisma.restaurantTable.findMany({
    orderBy: { number: "asc" },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-cream-50">
          {t("layoutTitle")}
        </h1>
        <p className="text-cream-300 text-sm mt-1">
          {t("layoutSubtitle")}
        </p>
      </header>

      <LayoutEditor
        initialTables={tables.map((t) => ({
          id: t.id,
          number: t.number,
          seats: t.seats,
          x: t.x,
          y: t.y,
          shape: t.shape as "ROUND" | "SQUARE",
          active: t.active,
        }))}
      />
    </div>
  );
}
