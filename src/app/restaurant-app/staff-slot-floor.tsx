"use client";

import { useMemo, useState } from "react";
import {
  FloorPlan,
  type FloorTable,
  type TableState,
} from "@/components/restaurant/floor-plan";

interface SlotEntry {
  iso: string;
  label: string;
  holders: { tableNumber: number; userName: string; partySize: number }[];
}

interface Props {
  tables: FloorTable[];
  slots: SlotEntry[];
}

/** Staff-side visualizer: pick a time slot and see which tables are
 *  booked for that exact datetime, color-coded on the floor plan. */
export function StaffSlotFloor({ tables, slots }: Props) {
  const initial = slots.find((s) => s.holders.length > 0)?.label ?? slots[0]?.label ?? "";
  const [picked, setPicked] = useState<string>(initial);

  const active = slots.find((s) => s.label === picked) ?? slots[0];

  const stateByNumber = useMemo(() => {
    const map = new Map<number, TableState>();
    if (!active) {
      for (const tt of tables) map.set(tt.number, "neutral");
      return map;
    }
    const taken = new Set(active.holders.map((h) => h.tableNumber));
    for (const tt of tables) {
      map.set(tt.number, taken.has(tt.number) ? "booked" : "free");
    }
    return map;
  }, [active, tables]);

  return (
    <div className="rounded-2xl border border-gold-500/20 bg-forest-900/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {slots.map((s) => {
          const isActive = s.label === picked;
          const occupied = s.holders.length;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => setPicked(s.label)}
              className={
                "px-3 py-1.5 rounded-lg text-xs transition " +
                (isActive
                  ? "bg-gradient-gold text-forest-950 shadow-sm"
                  : occupied > 0
                    ? "bg-gold-400/10 border border-gold-500/30 text-gold-200 hover:border-gold-400"
                    : "bg-forest-900/60 border border-ivory-50/10 text-cream-400 hover:text-cream-200")
              }
            >
              {s.label}
              {occupied > 0 && (
                <span className="ml-1.5 text-[10px] opacity-80">
                  · {occupied}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <FloorPlan tables={tables} stateByNumber={stateByNumber} showChairs />

      {active && active.holders.length > 0 && (
        <ul className="grid sm:grid-cols-2 gap-1.5 text-xs">
          {active.holders.map((h) => (
            <li
              key={h.tableNumber}
              className="flex items-center gap-2 px-2 py-1 rounded bg-forest-900/60 border border-gold-500/20"
            >
              <span className="font-display text-gold-300 w-6 text-center">
                {h.tableNumber}
              </span>
              <span className="text-cream-100 flex-1 truncate">{h.userName}</span>
              <span className="text-cream-400">{h.partySize}p</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
