// Single source of truth for all admin-fee calculations (0,17%).
// Used by BOTH the frontend (UI previews) and the backend (server.ts Duitku
// inquiry amount, transparency endpoint) so every displayed number stays in sync.

/** Admin fee rate: 0,17% (0.0017) of the nominal donation / withdrawal. */
export const ADMIN_FEE_RATE = 0.0017;

/** Minimum withdrawal (penarikan/pencairan) amount in IDR. */
export const MIN_WITHDRAWAL = 1_000_000;

/** Biaya Admin = Nominal × 0,17% (rounded to the nearest rupiah). */
export function calculateAdminFee(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * ADMIN_FEE_RATE);
}

/** Total Dibayar = Nominal Donasi + Biaya Admin. */
export function calculateTotalPayment(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return amount + calculateAdminFee(amount);
}
