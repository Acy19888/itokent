// Restaurant capacity configuration.
//
// The restaurant has a small number of physical tables (each seats ~4),
// but capacity is enforced by TOTAL SEATS per exact datetime — not per
// table. A party of 8 is valid; the staff will physically combine tables
// for that reservation. A single reservation reserves one primary table
// (for the staff panel to anchor it) but occupies `partySize` seats from
// the slot's total capacity.
//
// Rule: sum of confirmed partySizes at a given exact datetime
//       must be ≤ TOTAL_SEATS. Each reservation still gets its own
//       `tableNumber` (1..TOTAL_TABLES) as a staff-side label.

export const TOTAL_TABLES = 10;
export const SEATS_PER_TABLE = 4;
export const TOTAL_SEATS = TOTAL_TABLES * SEATS_PER_TABLE; // 40
/** Hard cap on an individual booking (for UI sanity — you can't book more
 *  seats than the restaurant has in total at once). */
export const MAX_PARTY_SIZE = TOTAL_SEATS;

/** 1..10 as a fixed list, useful for rendering the table grid in staff view. */
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
