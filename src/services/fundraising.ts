import { FundraisingReport, FundraisingSummary } from '../types';
import { auth } from '../config/firebase';

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

/**
 * Laporan AKHIR satu bencana (`GET /api/fundraising/report/:disasterId`).
 * Semua angka di-derive server-side dari data transaksi nyata.
 */
export async function fetchFundraisingReport(
  disasterId: string
): Promise<FundraisingReport | null> {
  try {
    const res = await fetch(`/api/fundraising/report/${encodeURIComponent(disasterId)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? (json.data as FundraisingReport) : null;
  } catch (error) {
    console.warn('fetchFundraisingReport notice:', error);
    return null;
  }
}

/**
 * Menutup penggalangan satu bencana (`POST /api/fundraising/admin/close`).
 * Hanya admin (Firebase ID token + role admin). Status → 'archived' + audit
 * + event timeline `fundraising_closed`.
 */
export async function closeFundraising(
  disasterId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      return { success: false, message: 'Sesi admin belum siap. Silakan login ulang.' };
    }
    const res = await fetch('/api/fundraising/admin/close', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ disasterId }),
    });
    const json = await res.json();
    return { success: !!json?.success, message: json?.message };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Gagal menutup penggalangan.' };
  }
}