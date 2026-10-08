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

/**
 * Smallest saldo that can actually fund MIN_WITHDRAWAL: the admin fee is paid
 * ON TOP of the nominal, so the balance must cover nominal + fee.
 * Example: Rp1.000.000 + 0,17% = Rp1.001.700.
 */
export const MIN_WITHDRAWAL_TOTAL = MIN_WITHDRAWAL + calculateAdminFee(MIN_WITHDRAWAL);

/**
 * Largest nominal withdrawal whose TOTAL outflow (nominal + admin fee) still
 * fits inside `remaining`. Used to cap the nominal input so that
 * nominal + biaya admin never exceeds the available balance.
 */
export function maxWithdrawableAmount(remaining: number): number {
  if (!Number.isFinite(remaining) || remaining <= 0) return 0;
  let max = Math.floor(remaining / (1 + ADMIN_FEE_RATE));
  while (max > 0 && max + calculateAdminFee(max) > remaining) max -= 1;
  while (max + 1 + calculateAdminFee(max + 1) <= remaining) max += 1;
  return max;
}
