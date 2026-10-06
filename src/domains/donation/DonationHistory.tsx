import React from 'react';
import { HeartHandshake, Route, Clock, CheckCircle2, XCircle, ArrowUpRight, Receipt } from 'lucide-react';
import { Donation } from '../../types';
import { formatRupiah, formatDateIndo } from '../../lib/utils';

interface DonationHistoryProps {
  donations: Donation[];
  onOpenTracking: (donationId: string) => void;
  onOpenDonate: () => void;
  onResumePayment?: (donationId: string) => void;
}

export const DonationHistory: React.FC<DonationHistoryProps> = ({
  donations,
  onOpenTracking,
  onOpenDonate,
  onResumePayment,
}) => {
  const totalPaid = donations
    .filter((d) => d.status === 'paid')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalCount = donations.filter((d) => d.status === 'paid').length;

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500">Total Donasi Tersalurkan</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1B3322] font-mono">
            {formatRupiah(totalPaid)}
          </div>
          <p className="text-xs text-slate-400">Tercatat secara sah dan transparan dalam sistem</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-500">Frekuensi Kebaikan</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1B3322] font-mono">
            {totalCount} Transaksi
          </div>
          <p className="text-xs text-slate-400">Setiap rupiah membantu korban bencana di lapangan</p>
        </div>
      </div>

      {/* Donation List Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">Riwayat Donasi Anda</h3>
            <p className="text-xs text-slate-500 mt-0.5">Daftar transaksi donasi yang tercatat atas akun Anda.</p>
          </div>
          <button
            onClick={onOpenDonate}
            className="px-4 py-2 rounded-full bg-[#1B3322] text-[#B2D850] text-xs font-bold hover:bg-[#243E2C] transition-colors"
          >
            Donasi Baru
          </button>
        </div>

        {donations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <HeartHandshake className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Belum Ada Riwayat Donasi</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Anda belum melakukan donasi. Mari ulurkan tangan untuk saudara-saudara kita yang tertimpa bencana.
            </p>
            <button
              onClick={onOpenDonate}
              className="mt-2 px-5 py-2.5 rounded-full bg-[#B2D850] text-[#1B3322] text-xs font-bold shadow-sm"
            >
              Mulai Donasi Pertama
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {donations.map((donation) => {
              const isPaid = donation.status === 'paid';
              return (
                <div
                  key={donation.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-slate-900">
                        {formatRupiah(donation.amount)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : donation.status === 'pending_payment'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isPaid ? 'Berhasil' : donation.status === 'pending_payment' ? 'Pending' : 'Gagal'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>{donation.disasterTitle || 'Tanggap Bencana Umum'}</span>
                      <span>•</span>
                      <span className="font-mono">{formatDateIndo(donation.createdAt)}</span>
                      {donation.isAnonymous && (
                        <>
                          <span>•</span>
                          <span className="italic text-slate-400">Anonim</span>
                        </>
                      )}
                    </div>

                    {donation.message && (
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-xl mt-1 max-w-lg border border-slate-100">
                        "{donation.message}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {donation.status === 'pending_payment' && onResumePayment && (
                      <button
                        onClick={() => onResumePayment(donation.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] text-xs font-bold transition-all shadow-sm"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Lanjutkan Pembayaran</span>
                      </button>
                    )}

                    {isPaid && (
                      <button
                        onClick={() => onOpenTracking(donation.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-sm shrink-0"
                      >
                        <Route className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Lacak Penyaluran</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
