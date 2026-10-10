import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  LogIn,
  Receipt,
  Route,
  UserCheck,
} from 'lucide-react';
import { Donation } from '../../types';
import { formatRupiah, formatDateIndo } from '../../lib/utils';
import { WideNavbar } from '../../components/layout/WideNavbar';
import { WideFooter } from '../../components/layout/WideFooter';
import { useAuth } from '../access/AuthContext';

interface TransactionHistoryPageProps {
  donations: Donation[];
}

interface StatusMeta {
  label: string;
  className: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const getStatusMeta = (status: Donation['status']): StatusMeta => {
  switch (status) {
    case 'paid':
      return {
        label: 'Berhasil',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Icon: CheckCircle2,
      };
    case 'pending_payment':
      return {
        label: 'Belum Dibayar',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
        Icon: Clock,
      };
    default:
      return {
        label: status === 'expired' ? 'Kedaluwarsa' : status === 'refunded' ? 'Dikembalikan' : 'Gagal',
        className: 'bg-rose-50 text-rose-700 border-rose-200',
        Icon: XCircle,
      };
  }
};

export const TransactionHistoryPage: React.FC<TransactionHistoryPageProps> = ({ donations }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const sorted = [...donations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const pendingList = sorted.filter((d) => d.status === 'pending_payment');
  const totalPending = pendingList.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = sorted
    .filter((d) => d.status === 'paid')
    .reduce((sum, d) => sum + d.amount, 0);

  const handleRowAction = (donation: Donation) => {
    if (donation.status === 'pending_payment') {
      navigate(`/transaction/checkout/${donation.id}`);
    } else {
      navigate(`/transaction/status/${donation.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 selection:bg-[#0C8F63] selection:text-white">
      <WideNavbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="border-b border-slate-200/80 pb-6 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold w-fit">
            <Receipt className="w-3.5 h-3.5" />
            <span>Cek Transaksi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Cek & Lanjutkan Transaksi Anda
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Semua transaksi donasi Anda tercatat di sini. Jika Anda keluar dari halaman pembayaran,
            kembali ke halaman ini dan lanjutkan transaksi yang masih menunggu pembayaran.
          </p>
        </div>

        {!user ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm text-center max-w-xl mx-auto space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border-4 border-emerald-100 shadow-xs">
              <LogIn className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900">Masuk untuk Mengecek Transaksi</h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                Riwayat dan status pembayaran donasi hanya dapat diakses oleh akun donatur yang
                melakukan transaksi.
              </p>
            </div>
            <button
              onClick={() => navigate('/auth/login?redirect=/cek-transaksi')}
              className="px-6 py-3 rounded-xl bg-[#0C8F63] hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all hover:scale-105 cursor-pointer inline-flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk dengan Google</span>
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {user && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium w-fit">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Akun: <strong>{user.displayName || user.email}</strong>
                </span>
              </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm space-y-2">
                <span className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Menunggu Pembayaran
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono">
                  {formatRupiah(totalPending)}
                </div>
                <p className="text-xs text-slate-400">{pendingList.length} transaksi belum selesai dibayar</p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                <span className="text-xs font-semibold text-slate-500">Total Donasi Berhasil</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
                  {formatRupiah(totalPaid)}
                </div>
                <p className="text-xs text-slate-400">Tercatat sah dan transparan dalam sistem</p>
              </div>
            </div>

            {donations.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center space-y-3">
                <Heart className="w-10 h-10 text-slate-300 mx-auto fill-current" />
                <h4 className="text-sm font-bold text-slate-700">Belum Ada Transaksi</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Anda belum melakukan donasi. Mari ulurkan tangan untuk saudara-saudara kita yang
                  tertimpa bencana.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-[#0C8F63] hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  Mulai Donasi Pertama
                </button>
              </div>
            ) : (
              <>
                {/* Pending Transactions — Resume Path */}
                {pendingList.length > 0 && (
                  <div className="bg-white rounded-3xl border border-amber-200/70 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-amber-100 bg-amber-50/50">
                      <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        Transaksi Menunggu Pembayaran
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Selesaikan pembayaran agar donasi Anda tercatat dan dapat disalurkan.
                      </p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {pendingList.map((donation) => {
                        const meta = getStatusMeta(donation.status);
                        return (
                          <div
                            key={donation.id}
                            className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-base font-bold text-slate-900">
                                  {formatRupiah(donation.amount)}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${meta.className}`}
                                >
                                  <meta.Icon className="w-3 h-3" />
                                  {meta.label}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span>{donation.disasterTitle || 'Tanggap Bencana Umum'}</span>
                                <span>•</span>
                                <span className="font-mono">{formatDateIndo(donation.createdAt)}</span>
                                <span>•</span>
                                <span className="font-mono text-slate-400">ID: {donation.id}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleRowAction(donation)}
                              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0C8F63] hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shrink-0"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Lanjutkan Pembayaran</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All Transactions */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-base text-slate-900">Semua Transaksi</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Riwayat lengkap transaksi donasi atas akun Anda.
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {sorted.map((donation) => {
                      const meta = getStatusMeta(donation.status);
                      const isPending = donation.status === 'pending_payment';
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
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${meta.className}`}
                              >
                                <meta.Icon className="w-3 h-3" />
                                {meta.label}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>{donation.disasterTitle || 'Tanggap Bencana Umum'}</span>
                              <span>•</span>
                              <span className="font-mono">{formatDateIndo(donation.createdAt)}</span>
                              <span>•</span>
                              <span className="font-mono text-slate-400">ID: {donation.id}</span>
                              {donation.isAnonymous && (
                                <>
                                  <span>•</span>
                                  <span className="italic text-slate-400">Anonim</span>
                                </>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleRowAction(donation)}
                            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm shrink-0 ${
                              isPending
                                ? 'bg-[#0C8F63] hover:bg-emerald-700 text-white'
                                : 'border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                            }`}
                          >
                            {isPending ? (
                              <>
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Lanjutkan Pembayaran</span>
                              </>
                            ) : donation.status === 'paid' ? (
                              <>
                                <Route className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Lihat Status & Lacak</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                <span>Lihat Detail</span>
                              </>
                            )}
                            <ArrowRight className="w-3.5 h-3.5 text-current opacity-60" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <WideFooter />
    </div>
  );
};
