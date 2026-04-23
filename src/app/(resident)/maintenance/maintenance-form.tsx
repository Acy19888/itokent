"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createMaintenanceTicket } from "@/lib/actions/maintenance";
import { Check } from "lucide-react";

const CATEGORIES = ["ELECTRIC", "PLUMBING", "GARDEN", "POOL", "OTHER"] as const;
const PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;

export function MaintenanceForm() {
  const t = useTranslations("Maintenance");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ok, setOk] = useState(false);

  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("OTHER");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("NORMAL");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await createMaintenanceTicket({ category, title, description, priority });
      if (res.ok) {
        setOk(true);
        setTitle(""); setDescription(""); setCategory("OTHER"); setPriority("NORMAL");
        router.refresh();
        setTimeout(() => setOk(false), 3000);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label-luxury">{t("category")}</label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCategory(c)}
              className={
                "px-2 py-2 rounded-lg border text-xs font-medium transition " +
                (category === c
                  ? "bg-forest-900 text-cream-50 border-transparent"
                  : "bg-white border-forest-200 text-forest-700 hover:border-gold-400")
              }
            >
              {t(`categories.${c}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label-luxury">{t("title_field")}</label>
        <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className="input-luxury" />
      </div>

      <div>
        <label className="label-luxury">{t("description")}</label>
        <textarea required rows={4} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} className="input-luxury" />
      </div>

      <div>
        <label className="label-luxury">{t("priority")}</label>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITIES.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setPriority(p)}
              className={
                "px-2 py-2 rounded-lg border text-xs font-medium transition " +
                (priority === p
                  ? "bg-gradient-gold text-forest-950 border-transparent"
                  : "bg-white border-forest-200 text-forest-700 hover:border-gold-400")
              }
            >
              {t(`priorities.${p}`)}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" disabled={pending} className="btn-gold w-full">
        {pending ? "..." : t("submit")}
      </button>

      {ok && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-forest-50 text-forest-700 text-sm">
          <Check className="w-4 h-4" /> {t("submitted")}
        </div>
      )}
    </form>
  );
}
