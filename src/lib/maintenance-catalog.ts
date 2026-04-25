/**
 * Fixed catalog of maintenance call-out fees, in MINOR units (kuruş for TRY).
 *
 * Some categories pull in a paid contractor (electrician, plumber); others
 * are covered by the community's regular budget (gardener, pool service)
 * and are therefore free to the resident.
 *
 * The fee that lands on a ticket is a *snapshot*: we copy the value into
 * `MaintenanceTicket.feeAmount` at creation time, so adjusting this catalog
 * later does not retroactively re-price already-filed tickets.
 */

export type MaintenanceCategory =
  | "ELECTRIC"
  | "PLUMBING"
  | "GARDEN"
  | "POOL"
  | "OTHER";

export interface CategoryFee {
  amount: number; // minor units, e.g. 75000 = ₺750.00
  currency: "TRY";
}

export const MAINTENANCE_FEES: Record<MaintenanceCategory, CategoryFee> = {
  ELECTRIC: { amount: 75000, currency: "TRY" }, // ₺750 — outside electrician
  PLUMBING: { amount: 50000, currency: "TRY" }, // ₺500 — outside plumber
  GARDEN: { amount: 0, currency: "TRY" }, // covered by service charge
  POOL: { amount: 0, currency: "TRY" }, // covered by service charge
  OTHER: { amount: 0, currency: "TRY" }, // billed case-by-case if needed
};

export function feeForCategory(c: MaintenanceCategory): CategoryFee {
  return MAINTENANCE_FEES[c];
}

export function isPaidCategory(c: MaintenanceCategory): boolean {
  return MAINTENANCE_FEES[c].amount > 0;
}
