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
  MapPin,
} from 'lucide-react';
import { Disbursement, Disaster, Partner, PartnerAllocation, Donation } from '../../types';
import {
  createDisbursement,
  updateDisbursementStatus,
  createPartnerAllocation,
  addAuditLog,
} from '../../integrations/firebase/firestore';
import { useAuth } from '../access/AuthContext';
import { useToast } from '../../components/feedback/Toast';
import { formatRupiah, formatDateIndo } from '../../lib/utils';
import { calculateAdminFee, MIN_WITHDRAWAL, MIN_WITHDRAWAL_TOTAL, maxWithdrawableAmount } from '../../lib/fees';

interface DisbursementManagerProps {
  disbursements: Disbursement[];
  donations: Donation[];
  disasters: Disaster[];
  partners: Partner[];
  onDataChanged: () => void;
}

interface DisasterRecap {
  disasterId: string;
  disasterTitle: string;
  partnerName: string;
  partnerAssigned: boolean;
  paidIn: number;
  disbursed: number;
  disbursing: number;
  remaining: number;
}

/** Total kas keluar untuk satu penarikan = nominal + biaya admin (dokumen lama tanpa fee = nominal saja). */
const disbursementOutflow = (d: Disbursement): number =>
  d.totalAmount ?? d.amount + (d.fee ?? 0);

export const DisbursementManager: React.FC<DisbursementManagerProps> = ({
  disbursements,
  donations,
  disasters,
  partners,
  onDataChanged,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [showModal, setShowModal] = useState<boolean>(false);
  const [amountStr, setAmountStr] = useState<string>('');
  const [selectedDisasterId, setSelectedDisasterId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const paidDonations = donations.filter((d) => d.status === 'paid');

  // Compute live financial totals from database (no fake numbers!)
  const totalPaidDonations = paidDonations.reduce((sum, d) => sum + d.amount, 0);

  const totalDisbursedSuccess = disbursements
    .filter((d) => d.status === 'success')
    .reduce((sum, d) => sum + disbursementOutflow(d), 0);

  const totalDisbursing = disbursements
    .filter((d) => d.status === 'processing' || d.status === 'submitted')
    .reduce((sum, d) => sum + disbursementOutflow(d), 0);

  const availableBalance = Math.max(0, totalPaidDonations - totalDisbursedSuccess - totalDisbursing);

  // Per-disaster / per-partner recap
  const buildRecap = (): DisasterRecap[] => {
    const rows = new Map<string, DisasterRecap>();

    const getRow = (disasterId: string, disasterTitle: string): DisasterRecap => {
      if (!rows.has(disasterId)) {
        const disaster = disasters.find((x) => x.id === disasterId);
        const partner = disaster?.partnerId
          ? partners.find((p) => p.id === disaster.partnerId)
          : undefined;
        rows.set(disasterId, {
          disasterId,
          disasterTitle: disaster?.title || disasterTitle,
          partnerName: partner?.name || 'Belum ada mitra',
          partnerAssigned: !!partner,
          paidIn: 0,
          disbursed: 0,
          disbursing: 0,
          remaining: 0,
        });
      }
      return rows.get(disasterId)!;
    };

    for (const don of paidDonations) {
      const key = don.disasterId || `__uncategorized__`;
      const row = getRow(key, don.disasterTitle || 'Donasi Tanpa Label Bencana');
      row.paidIn += don.amount;
    }

    for (const disb of disbursements) {
      const key = disb.disasterId || `__legacy__`;
      const row = getRow(key, disb.disasterTitle || 'Pencairan Lama (Tanpa Bencana)');
      if (disb.status === 'success') row.disbursed += disbursementOutflow(disb);
      else if (disb.status === 'submitted' || disb.status === 'processing')
        row.disbursing += disbursementOutflow(disb);
    }

    const list = Array.from(rows.values());
    for (const row of list) {
      row.remaining = Math.max(0, row.paidIn - row.disbursed - row.disbursing);
    }
    return list.sort((a, b) => b.paidIn - a.paidIn);
  };

  const recapRows = buildRecap();

  // Disasters eligible for new disbursement: has paid donations AND has assigned partner
  const eligibleDisasters = recapRows.filter((r) => r.paidIn > 0 && !r.disasterId.startsWith('__'));

  const selectedRecap = eligibleDisasters.find((r) => r.disasterId === selectedDisasterId);
  const selectedDisaster = disasters.find((x) => x.id === selectedDisasterId);
  const selectedPartner = selectedDisaster?.partnerId
    ? partners.find((p) => p.id === selectedDisaster.partnerId)
    : undefined;

  // Live withdrawal preview (biaya admin 0,17%)
  const previewAmount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0;
  const previewFee = calculateAdminFee(previewAmount);
  const previewTotal = previewAmount + previewFee;
  const belowMinimum = previewAmount > 0 && previewAmount < MIN_WITHDRAWAL;
  const exceedsRemaining = selectedRecap ? previewTotal > selectedRecap.remaining : false;
  // Max nominal = sisa kas − biaya admin (bukan sekadar sisa kas)
  const maxWithdrawable = selectedRecap ? maxWithdrawableAmount(selectedRecap.remaining) : 0;
  // Saldo harus sanggup menutup MIN_WITHDRAWAL + biaya admin-nya
  const canRequestDisbursement = availableBalance >= MIN_WITHDRAWAL_TOTAL;

  const handleCreateDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);
    const fee = Number.isFinite(amount) && amount > 0 ? calculateAdminFee(amount) : 0;
    const totalOutflow = amount + fee;

    if (isNaN(amount) || amount < MIN_WITHDRAWAL) {
      showToast(`Minimal penarikan dana adalah ${formatRupiah(MIN_WITHDRAWAL)}`, 'warning');
      return;
    }

    if (!selectedRecap || !selectedDisaster) {
      showToast('Harap pilih bencana tujuan pencairan', 'warning');
      return;
    }

    if (!selectedPartner) {
      showToast(
        'Bencana ini belum memiliki mitra. Tetapkan mitra terlebih dahulu di menu Verifikasi BMKG.',
        'error'
      );
      return;
    }

    if (totalOutflow > selectedRecap.remaining) {
      showToast(
        `Nominal + biaya admin (${formatRupiah(totalOutflow)}) melebihi sisa kas bencana ini (${formatRupiah(selectedRecap.remaining)})`,
        'error'
      );
      return;
    }

    setSubmitting(true);
    try {
      const disbId = `disb-${Date.now()}`;
      const newDisbursement: Disbursement = {
        id: disbId,
        amount,
        fee,
        totalAmount: totalOutflow,
        partnerId: selectedPartner.id,
        partnerName: selectedPartner.name,
        disasterId: selectedDisaster.id,
        disasterTitle: selectedDisaster.title,
        status: 'submitted',
        provider: 'Transfer Bank Operasional / Duitku Payout Adapter',
        requestedAt: new Date().toISOString(),
        notes,
        createdBy: user?.uid || 'admin',
      };

      await createDisbursement(newDisbursement);

      // Create linked partner allocation — source = paid donations of THIS disaster only
      const sourceDonationIds = paidDonations
        .filter((d) => d.disasterId === selectedDisaster.id)
        .map((d) => d.id);
      const allocId = `alloc-${Date.now()}`;
      const newAllocation: PartnerAllocation = {
        id: allocId,
        disbursementId: disbId,
        partnerId: selectedPartner.id,
        partnerName: selectedPartner.name,
        disasterId: selectedDisaster.id,
        disasterTitle: selectedDisaster.title,
        amount,
        sourceDonationIds,
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
        after: {
          amount,
          fee,
          totalAmount: totalOutflow,
          partnerId: selectedPartner.id,
          partnerName: selectedPartner.name,
          disasterId: selectedDisaster.id,
          disasterTitle: selectedDisaster.title,
        },
        timestamp: new Date().toISOString(),
      });

      showToast(
        `Pencairan ${formatRupiah(amount)} (biaya admin ${formatRupiah(fee)} → total keluar ${formatRupiah(totalOutflow)}) untuk bencana "${selectedDisaster.title}" diajukan ke ${selectedPartner.name}`,
        'success'
      );
      setShowModal(false);
      setAmountStr('');
      setNotes('');
      setSelectedDisasterId('');
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
          <span className="text-[10px] text-slate-400">Ringkasan semua bencana</span>
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

      {/* Per-Disaster / Per-Partner Recap */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B3322] uppercase tracking-wider mb-1">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Rekap Kas per Bencana &amp; Mitra</span>
          </div>
          <h3 className="font-bold text-base text-slate-900">Plot Dana Sesuai Bencana</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Setiap donasi masuk tercatat pada bencana tujuannya beserta mitra lapangan yang bertugas.
          </p>
        </div>

        {recapRows.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            Belum ada donasi masuk. Rekap per bencana akan tampil setelah donasi berstatus lunas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Bencana</th>
                  <th className="py-3 px-6">Mitra Lapangan</th>
                  <th className="py-3 px-6 text-right">Donasi Masuk</th>
                  <th className="py-3 px-6 text-right">Dicairkan</th>
                  <th className="py-3 px-6 text-right">Dalam Proses</th>
                  <th className="py-3 px-6 text-right">Sisa Kas Bencana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recapRows.map((row) => (
                  <tr key={row.disasterId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{row.disasterTitle}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {row.disasterId.startsWith('__') ? '-' : row.disasterId}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className={row.partnerAssigned ? 'text-slate-700' : 'text-rose-600 font-semibold'}>
                          {row.partnerName}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900 text-right">
                      {formatRupiah(row.paidIn)}
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-600 text-right">
                      {formatRupiah(row.disbursed)}
                    </td>
                    <td className="py-4 px-6 font-mono text-amber-700 text-right">
                      {formatRupiah(row.disbursing)}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-emerald-700 text-right">
                      {formatRupiah(row.remaining)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Manajemen Pencairan &amp; Alokasi Dana</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin mengajukan pencairan dana tunai kepada mitra resmi untuk logistik darurat
              lapangan. Minimal penarikan {formatRupiah(MIN_WITHDRAWAL)}.
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <button
              onClick={() => setShowModal(true)}
              disabled={!canRequestDisbursement}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] text-xs font-bold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Pengajuan Pencairan</span>
            </button>
            {!canRequestDisbursement && (
              <span className="text-[10px] text-rose-600 font-semibold">
                Saldo tersedia {formatRupiah(availableBalance)} — pencairan minimal{' '}
                {formatRupiah(MIN_WITHDRAWAL)} + biaya admin{' '}
                {formatRupiah(MIN_WITHDRAWAL_TOTAL - MIN_WITHDRAWAL)} ={' '}
                {formatRupiah(MIN_WITHDRAWAL_TOTAL)}
              </span>
            )}
          </div>
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
                  <th className="py-3 px-6">ID &amp; Tanggal</th>
                  <th className="py-3 px-6">Bencana Tujuan</th>
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
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{d.disasterTitle || 'Tanpa Bencana (Lama)'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{d.partnerName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900">
                      {formatRupiah(d.amount)}
                      <div className="text-[10px] font-normal text-amber-600 mt-0.5">
                        + Biaya admin 0,17% {formatRupiah(d.fee ?? 0)}
                      </div>
                      <div className="text-[10px] font-bold text-slate-600">
                        Total keluar {formatRupiah(disbursementOutflow(d))}
                      </div>
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
              Pilih bencana tujuan — mitra lapangan otomatis terkunci sesuai penugasan bencana.
            </p>

            <form onSubmit={handleCreateDisbursement} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Bencana Tujuan</label>
                <select
                  value={selectedDisasterId}
                  onChange={(e) => {
                    setSelectedDisasterId(e.target.value);
                    setAmountStr('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#B2D850] bg-white"
                  required
                >
                  <option value="">-- Pilih Bencana --</option>
                  {eligibleDisasters.map((r) => (
                    <option key={r.disasterId} value={r.disasterId}>
                      {r.disasterTitle} (sisa {formatRupiah(r.remaining)})
                    </option>
                  ))}
                </select>
                {eligibleDisasters.length === 0 && (
                  <p className="text-[11px] text-rose-600 mt-1.5">
                    Belum ada bencana dengan donasi masuk untuk dicairkan.
                  </p>
                )}
              </div>

              {selectedDisaster && (
                <div
                  className={`p-3.5 rounded-2xl border space-y-1.5 ${
                    selectedPartner
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Mitra Penerima (Otomatis)</span>
                  </div>
                  {selectedPartner ? (
                    <>
                      <div className="font-bold text-sm text-slate-900">{selectedPartner.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {selectedPartner.organization} — {selectedPartner.operationalArea}
                      </div>
                      <div className="text-[11px] text-emerald-700 font-mono pt-1 border-t border-emerald-200">
                        Sisa kas bencana: <strong>{formatRupiah(selectedRecap?.remaining || 0)}</strong>
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-rose-700 leading-relaxed">
                      Bencana ini <strong>belum ditugaskan ke mitra lapangan</strong>. Tetapkan mitra
                      terlebih dahulu di menu <strong>Verifikasi BMKG</strong> sebelum pencairan dapat
                      diajukan.
                    </div>
                  )}
                </div>
              )}

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
                {selectedRecap && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Minimal {formatRupiah(MIN_WITHDRAWAL)} • Maksimal{' '}
                    {formatRupiah(maxWithdrawable)} (sisa kas{' '}
                    {formatRupiah(selectedRecap.remaining)} dikurangi biaya admin)
                  </p>
                )}
                {belowMinimum && (
                  <p className="text-[10px] text-rose-600 font-semibold mt-1">
                    Minimal penarikan {formatRupiah(MIN_WITHDRAWAL)}
                  </p>
                )}
              </div>

              {/* Rincian biaya penarikan (transparan) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-[11px] font-mono">
                <div className="flex justify-between text-slate-500">
                  <span>Saldo Tersedia</span>
                  <span className="font-bold text-slate-700">
                    {formatRupiah(availableBalance)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Dana Ditarik</span>
                  <span className="font-bold text-slate-700">
                    {formatRupiah(previewAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Biaya Admin Penarikan 0,17%</span>
                  <span className="font-bold text-amber-600">{formatRupiah(previewFee)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200 text-slate-700">
                  <span className="font-bold">Total Pengeluaran</span>
                  <span className="font-extrabold">{formatRupiah(previewTotal)}</span>
                </div>
                {exceedsRemaining && (
                  <p className="text-[10px] text-rose-600 font-sans font-semibold pt-1">
                    Melebihi sisa kas bencana ({formatRupiah(selectedRecap?.remaining || 0)})
                  </p>
                )}
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
                Pencairan hanya mengambil dana dari kas bencana terpilih dan otomatis tercatat di
                dashboard mitra sebagai alokasi bencana tersebut.
              </div>

              <button
                type="submit"
                disabled={
                  submitting ||
                  !selectedPartner ||
                  !selectedRecap ||
                  previewAmount < MIN_WITHDRAWAL ||
                  exceedsRemaining
                }
                className="w-full py-3 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  Ajukan Pencairan {previewAmount > 0 ? formatRupiah(previewAmount) : ''} ➔
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
