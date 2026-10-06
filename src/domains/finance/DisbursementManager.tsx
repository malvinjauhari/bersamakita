import React, { useState } from 'react';
import {
  Send,
  Plus,
  CheckCircle2,
  Clock,
  Building2,
  AlertCircle,
  FileCheck2,
  Loader2,
} from 'lucide-react';
import { Disbursement, Partner, PartnerAllocation, Donation } from '../../types';
import {
  createDisbursement,
  updateDisbursementStatus,
  createPartnerAllocation,
  addAuditLog,
} from '../../integrations/firebase/firestore';
import { useAuth } from '../access/AuthContext';
import { useToast } from '../../components/feedback/Toast';
import { formatRupiah, formatDateIndo } from '../../lib/utils';

interface DisbursementManagerProps {
  disbursements: Disbursement[];
  donations: Donation[];
  partners: Partner[];
  onDataChanged: () => void;
}

export const DisbursementManager: React.FC<DisbursementManagerProps> = ({
  disbursements,
  donations,
  partners,
  onDataChanged,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [showModal, setShowModal] = useState<boolean>(false);
  const [amountStr, setAmountStr] = useState<string>('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Compute live financial totals from database (no fake numbers!)
  const totalPaidDonations = donations
    .filter((d) => d.status === 'paid')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalDisbursedSuccess = disbursements
    .filter((d) => d.status === 'success')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalDisbursing = disbursements
    .filter((d) => d.status === 'processing' || d.status === 'submitted')
    .reduce((sum, d) => sum + d.amount, 0);

  const availableBalance = Math.max(0, totalPaidDonations - totalDisbursedSuccess - totalDisbursing);

  const handleCreateDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);

    if (isNaN(amount) || amount < 50000) {
      showToast('Nominal pencairan minimal Rp50.000', 'warning');
      return;
    }

    if (amount > availableBalance) {
      showToast('Nominal melebihi saldo kas tersedia yang belum dicairkan', 'error');
      return;
    }

    if (!selectedPartnerId) {
      showToast('Harap pilih mitra operasional penerima alokasi', 'warning');
      return;
    }

    const partner = partners.find((p) => p.id === selectedPartnerId);
    if (!partner) return;

    setSubmitting(true);
    try {
      const disbId = `disb-${Date.now()}`;
      const newDisbursement: Disbursement = {
        id: disbId,
        amount,
        partnerId: partner.id,
        partnerName: partner.name,
        status: 'submitted',
        provider: 'Transfer Bank Operasional / Duitku Payout Adapter',
        requestedAt: new Date().toISOString(),
        notes,
        createdBy: user?.uid || 'admin',
      };

      await createDisbursement(newDisbursement);

      // Create linked partner allocation per Section 25
      const paidDonationIds = donations.filter((d) => d.status === 'paid').map((d) => d.id);
      const allocId = `alloc-${Date.now()}`;
      const newAllocation: PartnerAllocation = {
        id: allocId,
        disbursementId: disbId,
        partnerId: partner.id,
        partnerName: partner.name,
        amount,
        sourceDonationIds: paidDonationIds.slice(0, 10), // Linked traceability
        status: 'allocated',
        allocatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await createPartnerAllocation(newAllocation);

      // Audit Log
      await addAuditLog({
        id: `audit-${Date.now()}`,
        actorId: user?.uid || 'admin',
        actorRole: 'admin',
        action: 'DISBURSEMENT_CREATED',
        entityType: 'disbursement',
        entityId: disbId,
        after: { amount, partnerId: partner.id, partnerName: partner.name },
        timestamp: new Date().toISOString(),
      });

      showToast(`Pencairan sebesar ${formatRupiah(amount)} berhasil diajukan untuk ${partner.name}`, 'success');
      setShowModal(false);
      setAmountStr('');
      setNotes('');
      onDataChanged();
    } catch (err: any) {
      showToast('Gagal membuat pencairan: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (disb: Disbursement, newStatus: Disbursement['status']) => {
    setUpdatingId(disb.id);
    try {
      await updateDisbursementStatus(disb.id, newStatus);
      await addAuditLog({
        id: `audit-${Date.now()}`,
        actorId: user?.uid || 'admin',
        actorRole: 'admin',
        action: 'DISBURSEMENT_STATUS_UPDATE',
        entityType: 'disbursement',
        entityId: disb.id,
        before: { status: disb.status },
        after: { status: newStatus },
        timestamp: new Date().toISOString(),
      });
      showToast(`Status pencairan diperbarui ke ${newStatus}`, 'success');
      onDataChanged();
    } catch (err: any) {
      showToast('Gagal memperbarui status: ' + err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Donasi Berhasil
          </span>
          <div className="text-xl font-bold text-slate-900 font-mono">
            {formatRupiah(totalPaidDonations)}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Tercatat masuk sistem</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Saldo Kas Tersedia
          </span>
          <div className="text-xl font-bold text-emerald-700 font-mono">
            {formatRupiah(availableBalance)}
          </div>
          <span className="text-[10px] text-slate-400">Siap dialokasikan ke mitra</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Sedang Diproses
          </span>
          <div className="text-xl font-bold text-amber-700 font-mono">
            {formatRupiah(totalDisbursing)}
          </div>
          <span className="text-[10px] text-slate-400">Pencairan antre / transfer</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Telah Dicairkan
          </span>
          <div className="text-xl font-bold text-slate-700 font-mono">
            {formatRupiah(totalDisbursedSuccess)}
          </div>
          <span className="text-[10px] text-slate-400">Diterima mitra di lapangan</span>
        </div>
      </div>

      {/* Main Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Manajemen Pencairan & Alokasi Dana</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin mengajukan pencairan dana tunai kepada mitra resmi untuk logistik darurat lapangan.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Pengajuan Pencairan</span>
          </button>
        </div>

        {/* List of Disbursements */}
        {disbursements.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Send className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Belum Ada Pengajuan Pencairan Dana</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Saat saldo donasi terkumpul, Anda dapat mencairkan dana dan mengalokasikannya ke mitra relawan terverifikasi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">ID & Tanggal</th>
                  <th className="py-3 px-6">Mitra Penerima</th>
                  <th className="py-3 px-6">Nominal Pencairan</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Catatan</th>
                  <th className="py-3 px-6 text-right">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {disbursements.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-mono">
                      <div className="font-bold text-slate-800">{d.id}</div>
                      <div className="text-[10px] text-slate-400">{formatDateIndo(d.requestedAt)}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{d.partnerName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {formatRupiah(d.amount)}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                          d.status === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : d.status === 'processing'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : d.status === 'submitted'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {d.status === 'success'
                          ? 'Tuntas'
                          : d.status === 'processing'
                          ? 'Diproses'
                          : d.status === 'submitted'
                          ? 'Diajukan'
                          : d.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 max-w-xs truncate">
                      {d.notes || '-'}
                    </td>
                    <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                      {d.status === 'submitted' && (
                        <button
                          onClick={() => handleUpdateStatus(d, 'processing')}
                          disabled={updatingId === d.id}
                          className="px-3 py-1 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[11px] border border-sky-200"
                        >
                          Proses Transfer
                        </button>
                      )}
                      {d.status === 'processing' && (
                        <button
                          onClick={() => handleUpdateStatus(d, 'success')}
                          disabled={updatingId === d.id}
                          className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-sm"
                        >
                          Selesaikan (Success)
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Buat Pencairan */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 text-slate-900 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Pengajuan Pencairan Dana Bencana</h3>
            <p className="text-xs text-slate-500 mb-5">
              Saldo kas donasi tersedia: <span className="font-mono font-bold text-emerald-700">{formatRupiah(availableBalance)}</span>
            </p>

            <form onSubmit={handleCreateDisbursement} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Mitra Penerima Dana</label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#B2D850] bg-white"
                  required
                >
                  <option value="">-- Pilih Mitra Lapangan --</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.operationalArea})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal Pencairan (Rp)</label>
                <input
                  type="text"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Contoh: 5000000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#B2D850] font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Kebutuhan Operasional</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Misal: Bantuan logistik darurat gempa, dapur umum..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#B2D850]"
                />
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                Pencairan ini akan mencatat alokasi baru di dashboard mitra terkait dan dapat dikonfirmasi penerimaannya oleh mitra tersebut.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Ajukan Pencairan Sekarang</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
