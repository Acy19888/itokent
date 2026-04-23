"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { reserveTable } from "@/lib/actions/restaurant";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const TIMES: { hour: number; minute: 0 | 30; label: string }[] = [
  { hour: 18, minute: 0, label: "18:00" },
  { hour: 18, minute: 30, label: "18:30" },
  { hour: 19, minute: 0, label: "19:00" },
  { hour: 19, minute: 30, label: "19:30" },
  { hour: 20, minute: 0, label: "20:00" },
  { hour: 20, minute: 30, label: "20:30" },
  { hour: 21, minute: 0, label: "21:00" },
  { hour: 21, minute: 30, label: "21:30" },
  { hour: 22, minute: 0, label: "22:00" },
];

export function RestaurantForm() {
  const t = useTranslations("Restaurant");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ok, setOk] = useState(false);

  const [dateKey, setDateKey] = useState("");
  const [time, setTime] = useState<(typeof TIMES)[number] | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");

  const todayKey = new Date().toISOString().slice(0, 10);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!time) return;
    start(async () => {
      const res = await reserveTable({
        dateKey,
        hour: time.hour,
        minute: time.minute,
        partySize,
        notes: notes || undefined,
      });
      if (res.ok) {
        setOk(true);
        setTime(null);
        setNotes("");
        setDateKey("");
        setPartySize(2);
        router.refresh();
        setTimeout(() => setOk(false), 3000);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label-luxury">{t("date")}</label>
        <input
          type="date"
          required
          min={todayKey}
          value={dateKey}
          onChange={(e) => setDateKey(e.target.value)}
          className="input-luxury"
        />
      </div>

      <div>
        <label className="label-luxury">{t("time")}</label>
        <div className="grid grid-cols-3 gap-2">
          {TIMES.map((tm) => {
            const active = time?.label === tm.label;
            return (
              <button
                type="button"
                key={tm.label}
                onClick={() => setTime(tm)}
                className={cn(
                  "px-2 py-2.5 rounded-lg border text-sm font-medium transition",
                  active
                    ? "bg-gradient-gold text-forest-950 border-transparent shadow-sm"
                    : "bg-white border-forest-200 text-forest-700 hover:border-gold-400",
                )}
              >
                {tm.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label-luxury">{t("partySize")}</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPartySize(Math.max(1, partySize - 1))}
            className="w-10 h-10 rounded-full border border-forest-200 text-forest-700 hover:border-gold-400"
          >−</button>
          <div className="flex-1 text-center text-xl font-display text-forest-900">{partySize}</div>
          <button
            type="button"
            onClick={() => setPartySize(Math.min(20, partySize + 1))}
            className="w-10 h-10 rounded-full border border-forest-200 text-forest-700 hover:border-gold-400"
          >+</button>
        </div>
      </div>

      <div>
        <label className="label-luxury">{t("notes")}</label>
        <textarea
          rows={2}
          maxLength={300}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input-luxury"
        />
      </div>

      <button type="submit" disabled={pending || !time || !dateKey} className="btn-gold w-full">
        {pending ? "..." : t("book")}
      </button>

      {ok && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-forest-50 text-forest-700 text-sm">
          <Check className="w-4 h-4" /> {t("success")}
        </div>
      )}
    </form>
  );
}
