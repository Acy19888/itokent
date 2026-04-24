"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { reserveTable } from "@/lib/actions/restaurant";
import { Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEATS_PER_TABLE, TIME_SLOTS } from "@/lib/restaurant-config";

interface Props {
  /**
   * How many tables are already taken per exact datetime (ISO) in the
   * booking window. Rendered as "fully booked" hints only — the customer
   * never sees per-table detail. Capacity (10 tables) stays server-side
   * and in the restaurant staff view only.
   */
  slotCounts: { iso: string; count: number }[];
  /** Total tables available (kept server-side constant, passed through). */
  totalTables: number;
}

export function RestaurantForm({ slotCounts, totalTables }: Props) {
  const t = useTranslations("Restaurant");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dateKey, setDateKey] = useState("");
  const [time, setTime] = useState<(typeof TIME_SLOTS)[number] | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");

  const todayKey = new Date().toISOString().slice(0, 10);

  // Build a lookup of "taken count" for each time slot on the selected day.
  // We only expose a BOOLEAN (full / not full) to the customer — the exact
  // remaining count stays hidden to keep the UI simple and non-technical.
  const fullSlots = useMemo(() => {
    if (!dateKey) return new Set<string>();
    const full = new Set<string>();
    for (const tm of TIME_SLOTS) {
      const d = new Date(`${dateKey}T00:00:00`);
      d.setHours(tm.hour, tm.minute, 0, 0);
      const iso = d.toISOString();
      const hit = slotCounts.find((s) => s.iso === iso);
      if (hit && hit.count >= totalTables) full.add(tm.label);
    }
    return full;
  }, [slotCounts, dateKey, totalTables]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!time || !dateKey) return;
    setError(null);
    start(async () => {
      const res = await reserveTable({
        dateKey,
        hour: time.hour,
        minute: time.minute,
        partySize,
        notes: notes || undefined,
      });
      if (res.ok) {
        setFlash(t("success"));
        setTime(null);
        setNotes("");
        setDateKey("");
        setPartySize(2);
        router.refresh();
        setTimeout(() => setFlash(null), 3000);
      } else if (res.error === "FULLY_BOOKED") {
        setError(t("fullyBooked"));
        router.refresh();
      } else if (res.error === "PAST") {
        setError(t("pastSlot"));
      } else {
        setError(t("saveError"));
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
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

      {dateKey && (
        <div>
          <label className="label-luxury">{t("time")}</label>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((tm) => {
              const active = time?.label === tm.label;
              const full = fullSlots.has(tm.label);
              return (
                <button
                  type="button"
                  key={tm.label}
                  onClick={() => !full && setTime(tm)}
                  disabled={full}
                  className={cn(
                    "px-2 py-2.5 rounded-lg border text-sm font-medium transition",
                    full &&
                      "bg-forest-50 border-forest-100 text-forest-300 cursor-not-allowed line-through",
                    !full &&
                      !active &&
                      "bg-white border-forest-200 text-forest-700 hover:border-gold-400",
                    active &&
                      "bg-gradient-gold text-forest-950 border-transparent shadow-sm",
                  )}
                  title={full ? t("fullyBooked") : tm.label}
                >
                  {tm.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {time && (
        <div>
          <label className="label-luxury">{t("partySize")}</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPartySize(Math.max(1, partySize - 1))}
              className="w-10 h-10 rounded-full border border-forest-200 text-forest-700 hover:border-gold-400"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <div className="text-2xl font-display text-forest-900 leading-none">
                {partySize}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-forest-500 mt-1 flex items-center justify-center gap-1">
                <Users className="w-3 h-3" /> {partySize} / {SEATS_PER_TABLE}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setPartySize(Math.min(SEATS_PER_TABLE, partySize + 1))
              }
              className="w-10 h-10 rounded-full border border-forest-200 text-forest-700 hover:border-gold-400"
            >
              +
            </button>
          </div>
        </div>
      )}

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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !time || !dateKey}
        className="btn-gold w-full"
      >
        {pending ? "..." : t("book")}
      </button>

      {flash && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-forest-50 text-forest-700 text-sm">
          <Check className="w-4 h-4" /> {flash}
        </div>
      )}
    </form>
  );
}
