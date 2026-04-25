"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { reserveTable } from "@/lib/actions/restaurant";
import { Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIME_SLOTS } from "@/lib/restaurant-config";
import {
  FloorPlan,
  type FloorTable,
  type TableState,
} from "@/components/restaurant/floor-plan";

interface Props {
  tables: FloorTable[];
  /** For each (iso datetime, tableNumber): whether the current user holds
   *  it (mine=true) or someone else does. Anything not in this list is free. */
  slotTableHolder: { iso: string; tableNumber: number; mine: boolean }[];
}

export function RestaurantForm({ tables, slotTableHolder }: Props) {
  const t = useTranslations("Restaurant");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dateKey, setDateKey] = useState("");
  const [time, setTime] = useState<(typeof TIME_SLOTS)[number] | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [pickedTableId, setPickedTableId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const todayKey = new Date().toISOString().slice(0, 10);
  const totalTables = tables.length;
  const maxTableSeats = useMemo(
    () => tables.reduce((m, t) => Math.max(m, t.seats), 0),
    [tables],
  );

  // For each slot label, how many tables are still bookable for the
  // current party size on the selected date.
  const freeByLabel = useMemo(() => {
    const map = new Map<string, number>();
    if (!dateKey) return map;
    for (const tm of TIME_SLOTS) {
      const d = new Date(`${dateKey}T00:00:00`);
      d.setHours(tm.hour, tm.minute, 0, 0);
      const iso = d.toISOString();
      const taken = new Set(
        slotTableHolder.filter((h) => h.iso === iso).map((h) => h.tableNumber),
      );
      const free = tables.filter(
        (t) => !taken.has(t.number) && t.seats >= partySize,
      ).length;
      map.set(tm.label, free);
    }
    return map;
  }, [slotTableHolder, dateKey, partySize, tables]);

  // Compute floor-plan state once a date+time is picked.
  const stateByNumber = useMemo(() => {
    const map = new Map<number, TableState>();
    if (!dateKey || !time) {
      for (const tt of tables) map.set(tt.number, "neutral");
      return map;
    }
    const d = new Date(`${dateKey}T00:00:00`);
    d.setHours(time.hour, time.minute, 0, 0);
    const iso = d.toISOString();
    const heldHere = slotTableHolder.filter((h) => h.iso === iso);

    for (const tt of tables) {
      const holder = heldHere.find((h) => h.tableNumber === tt.number);
      if (holder?.mine) {
        map.set(tt.number, "mine");
        continue;
      }
      if (holder) {
        map.set(tt.number, "booked");
        continue;
      }
      if (tt.seats < partySize) {
        map.set(tt.number, "tooSmall");
        continue;
      }
      const picked = pickedTableId === tt.id;
      map.set(tt.number, picked ? "selected" : "free");
    }
    return map;
  }, [tables, dateKey, time, partySize, slotTableHolder, pickedTableId]);

  // Reset picked table when slot/party changes — old pick may no longer be valid.
  const onPickTable = (tt: FloorTable) => {
    if (!dateKey || !time) return;
    setError(null);
    setPickedTableId((cur) => (cur === tt.id ? null : tt.id));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!time || !dateKey || !pickedTableId) return;
    const picked = tables.find((t) => t.id === pickedTableId);
    if (!picked) return;
    setError(null);
    start(async () => {
      const res = await reserveTable({
        dateKey,
        hour: time.hour,
        minute: time.minute,
        partySize,
        tableNumber: picked.number,
        notes: notes || undefined,
      });
      if (res.ok) {
        setFlash(t("success"));
        setTime(null);
        setNotes("");
        setDateKey("");
        setPartySize(2);
        setPickedTableId(null);
        router.refresh();
        setTimeout(() => setFlash(null), 3000);
      } else if (res.error === "TABLE_TAKEN") {
        setError(t("tableTaken"));
        setPickedTableId(null);
        router.refresh();
      } else if (res.error === "PARTY_TOO_LARGE") {
        setError(t("partyTooLarge"));
      } else if (res.error === "PAST") {
        setError(t("pastSlot"));
      } else if (res.error === "INVALID_TABLE") {
        setError(t("saveError"));
      } else {
        setError(t("saveError"));
      }
    });
  };

  const showFloor = !!(dateKey && time);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="label-luxury">{t("date")}</label>
        <input
          type="date"
          required
          min={todayKey}
          value={dateKey}
          onChange={(e) => {
            setDateKey(e.target.value);
            setPickedTableId(null);
            setTime(null);
          }}
          className="input-luxury"
        />
      </div>

      {dateKey && (
        <div>
          <label className="label-luxury">{t("time")}</label>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((tm) => {
              const active = time?.label === tm.label;
              const free = freeByLabel.get(tm.label) ?? totalTables;
              const full = free === 0;
              return (
                <button
                  type="button"
                  key={tm.label}
                  onClick={() => {
                    if (full) return;
                    setTime(tm);
                    setPickedTableId(null);
                  }}
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

      <div>
        <label className="label-luxury">{t("partySize")}</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setPartySize(Math.max(1, partySize - 1));
              setPickedTableId(null);
            }}
            className="w-10 h-10 rounded-full border border-forest-200 text-forest-700 hover:border-gold-400"
          >
            −
          </button>
          <div className="flex-1 text-center">
            <div className="text-2xl font-display text-forest-900 leading-none">
              {partySize}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-forest-500 mt-1 flex items-center justify-center gap-1">
              <Users className="w-3 h-3" />
              {t("partySize").toLowerCase()}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPartySize(Math.min(maxTableSeats || 12, partySize + 1));
              setPickedTableId(null);
            }}
            className="w-10 h-10 rounded-full border border-forest-200 text-forest-700 hover:border-gold-400"
          >
            +
          </button>
        </div>
      </div>

      {showFloor && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="label-luxury">{t("pickTable")}</label>
            <FloorLegend />
          </div>
          <FloorPlan
            tables={tables}
            stateByNumber={stateByNumber}
            onTableClick={onPickTable}
            highlightId={pickedTableId ?? undefined}
            showChairs
          />
          {pickedTableId && (
            <p className="text-xs text-forest-600">
              {t("pickedHint", {
                n:
                  tables.find((t) => t.id === pickedTableId)?.number ?? "",
                seats:
                  tables.find((t) => t.id === pickedTableId)?.seats ?? 0,
              })}
            </p>
          )}
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
        disabled={pending || !time || !dateKey || !pickedTableId}
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

function FloorLegend() {
  const t = useTranslations("Restaurant");
  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-forest-500">
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-[#5cb6a8]" /> {t("legendFree")}
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-[#a3433f]" /> {t("legendBooked")}
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-[#f7c948]" /> {t("legendMine")}
      </span>
    </div>
  );
}
