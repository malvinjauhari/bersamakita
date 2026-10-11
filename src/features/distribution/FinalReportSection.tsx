import React, { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  Landmark,
  HandCoins,
  FileBarChart2,
  Users,
  ShieldCheck,
  Lock,
  RefreshCw,
  Clock,
  CircleCheck,
} from 'lucide-react';
import { FundraisingReport } from '../../types';
import { fetchFundraisingReport, closeFundraising } from '../../services/fundraising';
import { useToast } from '../../components/feedback/Toast';
import { formatRupiah, formatDateIndo } from '../../lib/utils';

interface FinalReportSectionProps {
  disasterId: string;
  /** Izinkan admin menutup penggalangan (selain tombol via DisbursementManager). */
  canClose?: boolean;
  onClosed?: () => void;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  admin_approved: { label: 'Berjalan', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  published: { label: 'Dipublikasikan', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  archived: { label: 'Penggalangan Ditutup', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  pending_verification: { label: 'Menunggu Verifikasi', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
};

/**
 * Laporan AKHIR per bencana — semua nominal di-derive server-side dari data
 * transaksi tercatat (`GET /api/fundraising/report/:disasterId`). Tidak ada
 * angka statis/input manual. Sama untuk semua pengamat.
 */
export const FinalReportSection: React.FC<FinalReportSectionProps> = ({
  disasterId,
  canClose,
  onClosed,
}) => {
  const { showToast } = useToast();
  const [report, setReport] = useState<FundraisingReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [closing, setClosing] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchFundraisingReport(disasterId);
    setReport(data);
    setLoading(false);
  }, [disasterId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleClose = async () => {
    if (!report) return;
    const ok = window.confirm(
      `Tutup penggalangan "${report.disasterTitle}"? Status bencana akan menjadi 'archived' dan penggalangan berhenti menerima donasi.`
    );
    if (!ok) return;
    setClosing(true);
    try {
      const result = await closeFundraising(disasterId);
      if (result.success) {
        showToast('Penggalangan berhasil ditutup', 'success');
        await load();
        onClosed?.();
      } else {
        showToast(result.message || 'Gagal menutup penggalangan', 'error');
      }
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Memuat laporan akhir...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
        Laporan akhir belum tersedia untuk bencana ini.
      </div>
    );
  }

  const s = report.summary;
  const percentTarget = report.fundingTarget
    ? Math.min(100, Math.round((s.totalCollected / report.fundingTarget) * 100))
    : 0;
  const isClosed = report.status === 'archived';
  const badge = STATUS_BADGE[report.status] || STATUS_BADGE.published;

  const statCards = [
    { label: 'Total Dana Terkumpul', value: formatRupiah(s.totalCollected), accent: 'text-emerald-700' },
    { label: 'Biaya Admin 0,17%', value: formatRupiah(s.adminFeeTotal), accent: 'text-slate-700' },
    { label: 'Telah Dicairkan', value: formatRupiah(s.disbursed), accent: 'text-indigo-700' },
    { label: 'Dalam Proses', value: formatRupiah(s.inflight), accent: 'text-amber-700' },
    { label: 'Sisa Kas Bencana', value: formatRupiah(s.remaining), accent: 'text-slate-900' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
          <FileBarChart2 className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
            Laporan Akhir Penggalangan
          </h3>
          <p className="text-[11px] text-slate-500 truncate">{report.disasterTitle}</p>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${badge.cls}`}>
          {badge.label}
        </span>
        <button
          onClick={load}
          className="p-2 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
          title="Muat ulang laporan"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Ringkasan finansial */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map((card) => (
            <div key={card.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                {card.label}
              </span>
              <span className={`font-mono text-sm font-extrabold ${card.accent}`}>{card.value}</span>
            </div>
          ))}
        </div>

        {/* Target & donatur */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <strong className="text-slate-700">{s.donationCount}</strong> transaksi valid
            {s.donorCount > 0 && (
              <> · <strong className="text-slate-700">{s.donorCount}</strong> donatur publik</>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            Target {formatRupiah(report.fundingTarget)} · tercapai {percentTarget}%
          </span>
          <span className="flex items-center gap-1.5">
            <HandCoins className="w-3.5 h-3.5 text-amber-600" />
            {s.reportsPublished} dari {s.reportsTotal} laporan distribusi terbit
          </span>
        </div>

        {/* Riwayat pencairan */}
        <div>
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-indigo-500" /> Riwayat Pencairan
          </h4>
          {report.disbursements.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">Belum ada pencairan.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {report.disbursements.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 bg-white">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-800 truncate">
                      {d.partnerName || 'Mitra'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatDateIndo(d.requestedAt)} · keluar {formatRupiah(d.totalAmount)}
                      {d.fee > 0 && ` (admin ${formatRupiah(d.fee)})`}
                    </p>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      d.status === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : d.status === 'submitted' || d.status === 'processing'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {{
                      success: 'Tersalurkan',
                      submitted: 'Diajukan',
                      processing: 'Diproses',
                      failed: 'Gagal',
                      cancelled: 'Dibatalkan',
                      draft: 'Draf',
                    }[d.status] || d.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Snapshot timeline */}
        {report.timeline.length > 0 && (
          <div>
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-500" /> Riwayat Penyaluran (Timeline Kolektif)
            </h4>
            <div className="space-y-2">
              {report.timeline.slice(0, 5).map((evt) => (
                <div key={evt.id} className="flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                  <CircleCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{evt.title}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-2">{evt.description}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{formatDateIndo(evt.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aksi admin */}
        {canClose && !isClosed && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Setelah ditutup, penggalangan berhenti menerima donasi & diarsipkan.
            </p>
            <button
              onClick={handleClose}
              disabled={closing}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
            >
              {closing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Tutup Penggalangan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};