import { FundraisingSummary } from '../types';

/**
 * Mengambil ringkasan fundraising KOLEKTIF per bencana dari server
 * (`GET /api/fundraising/summary`). Angka diagregasi Admin SDK di backend,
 * sehingga identik untuk semua role — tidak pernah dihitung dari data
 * donations milik user sendiri.
 */
export async function fetchFundraisingSummary(): Promise<FundraisingSummary | null> {
  try {
    const res = await fetch('/api/fundraising/summary');
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? (json.data as FundraisingSummary) : null;
  } catch (error) {
    console.warn('fetchFundraisingSummary notice:', error);
    return null;
  }
}