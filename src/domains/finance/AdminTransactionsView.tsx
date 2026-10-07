import React, { useState } from 'react';
import { CreditCard, Search, Filter, CheckCircle2, Clock, XCircle, ArrowUpRight, Trash2, AlertTriangle, Building2 } from 'lucide-react';
import { Donation, Disaster, Partner } from '../../types';
import { formatRupiah, formatDateIndo } from '../../lib/utils';
import { deleteFailedTransactions } from '../../integrations/firebase/firestore';
import { useToast } from '../../components/feedback/Toast';

interface AdminTransactionsViewProps {
  donations: Donation[];
  disasters: Disaster[];
  partners: Partner[];
  onDataChanged?: () => Promise<void>;
}

export const AdminTransactionsView: React.FC<AdminTransactionsViewProps> = ({
  donations,
  disasters,
  partners,
  onDataChanged,
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');
  const [showCleanupModal, setShowCleanupModal] = useState<boolean>(false);
  const [cleaning, setCleaning] = useState<boolean>(false);

  const failedCount = donations.filter((d) => d.status === 'failed').length;

  // Derive partner dynamically from the disaster (single source of truth, no data duplication)
  const resolvePartnerName = (d: Donation): string => {
    if (!d.disasterId) return '-';
    const disaster = disasters.find((x) => x.id === d.disasterId);
    if (!disaster?.partnerId) return 'Belum ada mitra';
    return partners.find((p) => p.id === disaster.partnerId)?.name || 'Mitra tidak ditemukan';
  };

  const resolveDisasterTitle = (d: Donation): string => {
    if (d.disasterTitle) return d.disasterTitle;
    if (d.disasterId) {
      const disaster = disasters.find((x) => x.id === d.disasterId);
      if (disaster) return disaster.title;
    }
    return 'Tanpa Label Bencana';
  };

  const handleCleanupFailed = async () => {
    setCleaning(true);
    try {
      const deleted = await deleteFailedTransactions();
      showToast(
        deleted > 0
          ? `${deleted} dokumen transaksi gagal telah dihapus permanen.`
          : 'Tidak ada transaksi gagal untuk dihapus.',
        'success'
      );
      if (onDataChanged) {
        await onDataChanged();
      }
      setShowCleanupModal(false);
    } catch (err: any) {
      showToast('Gagal menghapus transaksi gagal: ' + (err.message || 'Error'), 'error');
    } finally {
      setCleaning(false);
    }
  };


  const filtered = donations.filter((d) => {
    const matchesSearch =
      d.id.toLowerCase().includes(search.toLowerCase()) ||
      d.donorName.toLowerCase().includes(search.toLowerCase()) ||
      d.donorEmail.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'pending'
        ? d.status === 'pending_payment'
        : d.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B3322] uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>Manajemen Keuangan Transaksi</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Seluruh Transaksi Donasi Masuk</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar transaksi terintegrasi dengan status gateway pembayaran Duitku.
          </p>
        </div>

        {/* Cleanup Failed History */}
        <button
          onClick={() => setShowCleanupModal(true)}
          disabled={failedCount === 0 || cleaning}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title={failedCount === 0 ? 'Tidak ada transaksi gagal' : 'Hapus permanen semua transaksi gagal dari histori user'}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Hapus Riwayat Transaksi Gagal ({failedCount})
        </button>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ID / Nama / Email..."
              className="w-full pl-9 pr-4 py-2 rounded-full border border-slate-200 text-xs focus:ring-2 focus:ring-[#B2D850] focus:outline-none"
            />
          </div>

          <div className="flex gap-1.5 w-full sm:w-auto">
            {(['all', 'paid', 'pending', 'failed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize border transition-all ${
                  statusFilter === s
                    ? 'bg-[#1B3322] text-[#B2D850] border-[#1B3322]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {s === 'all' ? 'Semua' : s === 'paid' ? 'Sukses' : s === 'pending' ? 'Pending' : 'Gagal'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            {donations.length === 0 ? 'Belum ada transaksi donasi yang tercatat.' : 'Tidak ada transaksi yang cocok dengan filter pencarian.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">ID Donasi</th>
                  <th className="py-3 px-6">Donatur</th>
                  <th className="py-3 px-6">Nominal</th>
                  <th className="py-3 px-6">Bencana Terkait</th>
                  <th className="py-3 px-6">Mitra Lapangan</th>
                  <th className="py-3 px-6">Waktu Transaksi</th>
                  <th className="py-3 px-6">Status Gateway</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d) => {
                  const isPaid = d.status === 'paid';
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-slate-800">
                        {d.id}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">{d.donorName}</div>
                        <div className="text-[11px] text-slate-400">{d.donorEmail}</div>
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-900 text-sm">
                        {formatRupiah(d.amount)}
                      </td>
                      <td className="py-4 px-6 text-slate-600 max-w-xs truncate">
                        {resolveDisasterTitle(d)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{resolvePartnerName(d)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-mono text-[11px]">
                        {formatDateIndo(d.createdAt)}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : d.status === 'pending_payment'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isPaid ? 'Paid (Lunas)' : d.status === 'pending_payment' ? 'Pending' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cleanup Failed History Confirmation Modal */}
      {showCleanupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Hapus Histori Transaksi Gagal?
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                <strong>{failedCount} transaksi berstatus Gagal</strong> beserta catatan pembayaran
                terkait akan dihapus permanen dan <strong>tidak lagi muncul di histori user</strong>.
                <br /><br />
                Transaksi <strong>Lunas</strong> dan <strong>Pending</strong> tidak ikut terhapus.
                Operasi ini tidak dapat dibatalkan.
              </p>

              <div className="flex items-center gap-3 w-full pt-4">
                <button
                  onClick={() => setShowCleanupModal(false)}
                  disabled={cleaning}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleCleanupFailed}
                  disabled={cleaning}
                  className="flex-1 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {cleaning ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Ya, Hapus Permanen</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
