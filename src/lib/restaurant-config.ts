// Restaurant capacity constants.
// 10 tables × 4 seats each = 40 people max per exact time slot.
// Keep these in sync with the corresponding validators in
// src/lib/actions/restaurant.ts.

export const TOTAL_TABLES = 10;
export const SEATS_PER_TABLE = 4;

/** 1..10 as a fixed list, useful for rendering the table grid. */
export const TABLE_NUMBERS: readonly number[] = Array.from(
  { length: TOTAL_TABLES },
  (_, i) => i + 1,
);

/** Dinner slots in 30-min intervals, 18:00 → 22:00. */
export const TIME_SLOTS: readonly {
  hour: number;
  minute: 0 | 30;
  label: string;
}[] = [
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
