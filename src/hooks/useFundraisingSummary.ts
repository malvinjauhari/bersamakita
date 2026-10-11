import { useCallback, useEffect, useRef, useState } from 'react';
import { FundraisingDisaster, FundraisingSummary } from '../types';
import { fetchFundraisingSummary } from '../services/fundraising';

export interface DisasterFundStats {
  /** Dana terkumpul (donasi paid) untuk satu bencana. */
  total: number;
  /** Jumlah transaksi donasi paid. */
  count: number;
  /** Target penggalangan bencana (per-disaster atau default Rp50jt). */
  target: number;
}

/**
 * Hook sumber kebenaran progres donasi KOLEKTIF per bencana.
 * Semua akun (guest/user/admin/partner) membaca data yang sama dari
 * `GET /api/fundraising/summary` — progres tidak lagi dihitung dari
 * donations milik user sendiri (fix inkonsistensi antar-akun Google).
 */
export function useFundraisingSummary() {
  const [summary, setSummary] = useState<FundraisingSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const requestSeq = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const data = await fetchFundraisingSummary();
      if (seq !== requestSeq.current) return; // abaikan response basi
      setSummary(data);
      setError(!data);
    } catch {
      if (seq === requestSeq.current) setError(true);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getDisaster = useCallback(
    (disasterId: string): FundraisingDisaster | null =>
      summary?.disasters.find((d) => d.disasterId === disasterId) ?? null,
    [summary]
  );

  /** Statistik progres untuk satu bencana (0 default bila belum ada data). */
  const getDisasterStats = useCallback(
    (disasterId: string): DisasterFundStats => {
      const d = getDisaster(disasterId);
      return {
        total: d?.collected ?? 0,
        count: d?.donationCount ?? 0,
        target: d?.fundingTarget ?? 0,
      };
    },
    [getDisaster]
  );

  return {
    summary,
    totals: summary?.totals ?? null,
    disasters: summary?.disasters ?? [],
    loading,
    error,
    refresh,
    getDisaster,
    getDisasterStats,
  };
}