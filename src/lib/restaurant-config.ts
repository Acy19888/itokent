// Restaurant configuration.
//
// Tables themselves (count, seats, position) live in the database
// (`RestaurantTable` model) and are managed by restaurant staff via
// /restaurant-app/layout. The constants below are application-level:
// time slots and absolute UI guard-rails.

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

/** Hard absolute cap on how many seats a single physical table can have.
 *  Used by the staff layout editor (input range guard) and as the upper
 *  bound for `partySize` validation when no specific table is involved. */
export const MAX_SEATS_PER_TABLE = 12;

/** Floor-plan SVG coordinate space. Staff positions tables in this space;
 *  the renderer scales to the container. Keep this stable so old layouts
 *  remain meaningful when the canvas size changes in CSS. */
export const FLOOR_PLAN = {
  width: 1000,
  height: 600,
} as const;

/** Helper used by the staff editor to clamp a coordinate. */
export function clampToFloor(x: number, y: number) {
  return {
    x: Math.max(40, Math.min(FLOOR_PLAN.width - 40, x | 0)),
    y: Math.max(40, Math.min(FLOOR_PLAN.height - 40, y | 0)),
  };
}
