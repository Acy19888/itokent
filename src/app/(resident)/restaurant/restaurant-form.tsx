"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { reserveTable } from "@/lib/actions/restaurant";
import { Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SEATS_PER_TABLE,
  TABLE_NUMBERS,
  TIME_SLOTS,
} from "@/lib/restaurant-config";

interface Props {
  /** Already-booked (date ISO, table number) pairs for the next 2 weeks. */
  bookedSlots: { iso: string; tableNumber: number }[];
}

export function RestaurantForm({ bookedSlots }: Props) {
  const t = useTranslations("Restaurant");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dateKey, setDateKey] = useState("");
  const [time, setTime] = useState<(typeof TIME_SLOTS)[number] | null>(null);
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState("");

  const todayKey = new Date().toISOString().slice(0, 10);

  // Build a set of taken tables for the currently-selected date+time.
  // Keyed by ISO string so we match the server's Date serialization exactly.
  const takenForSelection = useMemo(() => {
    if (!dateKey || !time) return new Set<number>();
    const d = new Date(`${dateKey}T00:00:00`);
    d.setHours(time.hour, time.minute, 0, 0);
    const iso = d.toISOString();
    return new Set(
      bookedSlots.filter((s) => s.iso === iso).map((s) => s.tableNumber),
    );
  }, [bookedSlots, dateKey, time]);

  // If the user switches date/time and their previous table is now taken,
  // clear the selection so they don't accidentally submit a doomed request.
  useEffect(() => {
    if (tableNumber && takenForSelection.has(tableNumber)) {
      setTableNumber(null);
    }
  }, [tableNumber, takenForSelection]);

  const fullyBooked =
    dateKey && time && takenForSelection.size >= TABLE_NUMBERS.length;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!time || !tableNumber) return;
    setError(null);
    start(async () => {
      const res = await reserveTable({
        dateKey,
        hour: time.hour,
        minute: time.minute,
        tableNumber,
        partySize,
        notes: notes || undefined,
      });
      if (res.ok) {
        setFlash(t("success"));
        setTime(null);
        setTableNumber(null);
        setNotes("");
        setDateKey("");
        setPartySize(2);
        router.refresh();
        setTimeout(() => setFlash(null), 3000);
      } else if (res.error === "TABLE_TAKEN") {
        setError(t("tableTaken"));
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

      <div>
        <label className="label-luxury">{t("time")}</label>
        <div className="grid grid-cols-3 gap-2">
          {TIME_SLOTS.map((tm) => {
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

      {dateKey && time && (
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="label-luxury !mb-0">{t("table")}</label>
            <span className="text-[11px] text-forest-500">
              {TABLE_NUMBERS.length - takenForSelection.size} /{" "}
              {TABLE_NUMBERS.length} {t("available")}
            </span>
          </div>

          {fullyBooked ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-800">
              {t("fullyBooked")}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {TABLE_NUMBERS.map((n) => {
                const taken = takenForSelection.has(n);
                const active = tableNumber === n;
                return (
                  <button
                    type="button"
                    key={n}
                    onClick={() => !taken && setTableNumber(n)}
                    disabled={taken}
                    className={cn(
                      "relative aspect-square rounded-xl border-2 font-display text-lg transition",
                      taken &&
                        "bg-forest-50 border-forest-100 text-forest-300 cursor-not-allowed",
                      !taken &&
                        !active &&
                        "bg-white border-forest-200 text-forest-700 hover:border-gold-400",
                      active &&
                        "bg-gradient-gold border-transparent text-forest-950 shadow-sm",
                    )}
                    title={taken ? t("tableTaken") : `${t("table")} ${n}`}
                  >
                    {n}
                    <span className="absolute bottom-0.5 inset-x-0 text-[9px] uppercase tracking-wider opacity-70">
                      {taken ? t("booked") : `${SEATS_PER_TABLE} ${t("seats")}`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tableNumber != null && (
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
                <Users className="w-3 h-3" />{" "}
                {partySize} / {SEATS_PER_TABLE}
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
        disabled={pending || !time || !dateKey || !tableNumber}
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
