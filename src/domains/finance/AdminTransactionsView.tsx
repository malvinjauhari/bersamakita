import React, { useState } from 'react';
import { CreditCard, Search, Filter, CheckCircle2, Clock, XCircle, ArrowUpRight } from 'lucide-react';
import { Donation } from '../../types';
import { formatRupiah, formatDateIndo } from '../../lib/utils';

interface AdminTransactionsViewProps {
  donations: Donation[];
}

export const AdminTransactionsView: React.FC<AdminTransactionsViewProps> = ({ donations }) => {
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');

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
                        {d.disasterTitle || 'Tanggap Darurat Umum'}
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
    </div>
  );
};
