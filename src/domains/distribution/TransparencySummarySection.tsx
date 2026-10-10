import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  Banknote,
  Info,
  Loader2,
  RefreshCw,
  Users,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../../lib/utils';

interface TransparencyTransaction {
  id: string;
  donorName: string;
  amount: number;
  adminFee: number;
  totalPaid: number;
  paymentMethod: string;
  paidAt: string;
  disasterId: string;
  disasterTitle: string;
  keterangan: string;
  createdAt: string;
}

interface TransparencyDisaster {
  disasterId: string;
  disasterTitle: string;
  totalCollected: number;
  donationCount: number;
}

interface TransparencySummaryData {
  totalReceived: number;
  totalAdminFees: number;
  totalTransactions: number;
  adminFeeRate: number;
  disasters: TransparencyDisaster[];
  transactions: TransparencyTransaction[];
}

/**
 * Section paling atas halaman Transparansi Penyaluran:
 * 1. Riwayat Dana Masuk (transaksi masuk per donatur + rincian biaya 0,17%)
 * 2. Informasi Penggalangan Dana (total & per bencana)
 *
 * Data diambil dari GET /api/transparency/summary (Firebase Admin SDK),
 * sehingga angkanya identik untuk semua role (tamu/user/admin/partner).
 */
export const TransparencySummarySection: React.FC = () => {
  const [data, setData] = useState<TransparencySummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDisasterId, setFilterDisasterId] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/transparency/summary');
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Gagal memuat data transparansi');
      }
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data transparansi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const transactions = (data?.transactions || []).filter(
    (t) => !filterDisasterId || (t.disasterId || '__none__') === filterDisasterId
  );

  return (
    <div className="space-y-8">
      {/* ── 1. Riwayat Dana Masuk (paling atas) ─────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B3322] uppercase tracking-wider mb-1">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>Riwayat Dana Masuk</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Riwayat Transaksi Donasi</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Setiap pembayaran yang tercatat beserta biaya administrasi 0,17% — ditampilkan apa
              adanya untuk semua pengunjung.
            </p>
          </div>
          {data && (
            <span className="text-xs font-mono text-slate-600 shrink-0">
              {transactions.length} transaksi ditampilkan
            </span>
          )}
        </div>

        {/* Filter per bencana */}
        {data && data.disasters.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterDisasterId('')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                !filterDisasterId
                  ? 'bg-[#0C8F63] text-white border-[#0C8F63]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              Semua Bencana
            </button>
            {data.disasters.map((d) => (
              <button
                key={d.disasterId || d.disasterTitle}
                type="button"
                onClick={() => setFilterDisasterId(d.disasterId || '__none__')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  filterDisasterId === (d.disasterId || '__none__')
                    ? 'bg-[#0C8F63] text-white border-[#0C8F63]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                {d.disasterTitle}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B3322] mx-auto" />
            <p className="text-xs text-slate-600 font-semibold">Memuat riwayat dana masuk...</p>
          </div>
        ) : error ? (
          <div className="bg-white p-10 rounded-3xl border border-slate-100 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Data Transparansi Tidak Termuat</h3>
            <p className="text-xs text-slate-600">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0C8F63] text-white text-xs font-bold hover:bg-emerald-700 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3">
            <Banknote className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Belum Ada Dana Masuk</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Riwayat pembayaran donasi akan muncul di sini setelah pembayaran pertama tercatat
              dalam sistem.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7 space-y-4"
              >
                {/* Donatur + waktu */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">{t.donorName}</div>
                    <div className="text-xs text-slate-600 truncate">{t.keterangan}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-full bg-[#0C8F63] text-white text-[11px] font-bold">
                    {t.paymentMethod}
                  </span>
                </div>

                {/* Rincian biaya */}
                <div className="space-y-1 text-xs font-mono bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex justify-between text-slate-700">
                    <span>Donasi</span>
                    <span className="font-bold text-slate-900">{formatRupiah(t.amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Biaya Admin 0,17%</span>
                    <span className="font-bold text-amber-600">{formatRupiah(t.adminFee)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-200">
                    <span className="font-bold text-slate-700">Total Dibayar</span>
                    <span className="font-extrabold text-slate-900">
                      {formatRupiah(t.totalPaid)}
                    </span>
                  </div>
                </div>

                {/* Waktu + metode */}
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span>
                    Metode Pembayaran:{' '}
                    <strong className="text-slate-700">{t.paymentMethod}</strong>
                  </span>
                  <span className="font-mono">
                    Waktu Pembayaran: <strong className="text-slate-700">{formatDateIndo(t.paidAt)}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 2. Informasi Penggalangan Dana ──────────────────────────── */}
      <section className="space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B3322] uppercase tracking-wider mb-1">
            <Info className="w-4 h-4 text-emerald-600" />
            <span>Informasi Penggalangan Dana</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Total Donasi Terhimpun</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Angka berasal dari transaksi berstatus lunas yang benar-benar tercatat dalam sistem.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 animate-pulse">
                <div className="h-3 w-24 bg-slate-100 rounded mb-3" />
                <div className="h-6 w-36 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : data ? (
          <>
            {/* Global totals */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Total Dana yang Telah Didonasikan
                </span>
                <div className="text-xl font-bold text-emerald-700 font-mono">
                  {formatRupiah(data.totalReceived)}
                </div>
                <span className="text-[11px] text-slate-500">
                  Nominal donasi utuh, tanpa potongan biaya admin
                </span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Total Biaya Admin 0,17% Terkumpul
                </span>
                <div className="text-xl font-bold text-amber-600 font-mono">
                  {formatRupiah(data.totalAdminFees)}
                </div>
                <span className="text-[11px] text-slate-600">Dicatat terpisah dari dana donasi</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Jumlah Transaksi Donasi
                </span>
                <div className="text-xl font-bold text-slate-900 font-mono">
                  {data.totalTransactions}
                </div>
                <span className="text-[11px] text-slate-600">Pembayaran lunas tercatat</span>
              </div>
            </div>

            {/* Per-disaster totals */}
            {data.disasters.length === 0 ? (
              <div className="bg-white p-10 rounded-3xl border border-slate-100 text-center space-y-2">
                <Wallet className="w-9 h-9 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">Belum Ada Penggalangan Aktif</h3>
                <p className="text-xs text-slate-600">
                  Total donasi per bencana akan tampil setelah donasi pertama tercatat lunas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.disasters.map((d) => (
                  <div
                    key={d.disasterId || d.disasterTitle}
                    className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-sm text-slate-900 leading-snug">
                        {d.disasterTitle}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setFilterDisasterId(d.disasterId || '__none__');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="shrink-0 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-all"
                      >
                        Lihat Riwayat
                      </button>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-600 block">
                        Total Donasi Terkumpul
                      </span>
                      <span className="text-lg font-extrabold font-mono text-slate-900 block">
                        {formatRupiah(d.totalCollected)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        <strong className="text-slate-700">{d.donationCount}</strong> donatur
                        tercatat
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center text-xs text-slate-600">
            Data penggalangan tidak tersedia.
          </div>
        )}
      </section>
    </div>
  );
};
