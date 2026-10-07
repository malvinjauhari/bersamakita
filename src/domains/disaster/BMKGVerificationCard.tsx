import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Radio,
  ExternalLink,
  FastForward,
  Ban,
  RotateCcw,
  Save,
  Users,
} from 'lucide-react';
import { Disaster, Partner } from '../../types';
import {
  updateDisasterStatus,
  updateDisasterPartner,
  addAuditLog,
} from '../../integrations/firebase/firestore';
import { useAuth } from '../access/AuthContext';
import { useToast } from '../../components/feedback/Toast';
import { formatDateIndo } from '../../lib/utils';

interface BMKGVerificationCardProps {
  disasters: Disaster[];
  partners: Partner[];
  onRefreshBMKG: () => Promise<void>;
  onStatusUpdated: () => void;
}

const PUBLIC_STATUSES = ['admin_approved', 'auto_approved', 'published', 'archived'];

export const BMKGVerificationCard: React.FC<BMKGVerificationCardProps> = ({
  disasters,
  partners,
  onRefreshBMKG,
  onStatusUpdated,
}) => {
  const { staffSession } = useAuth();
  const { showToast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [selectedPartners, setSelectedPartners] = useState<Record<string, string>>({});

  const filtered = disasters.filter((d) => {
    if (filter === 'pending') return d.status === 'pending_verification';
    if (filter === 'approved') return PUBLIC_STATUSES.includes(d.status);
    return true;
  });

  const handleApprove = async (disaster: Disaster) => {
    const partnerId = selectedPartners[disaster.id];
    if (!partnerId) {
      showToast('Wajib memilih Mitra Lapangan sebelum approve!', 'error');
      return;
    }
    const partner = partners.find(p => p.id === partnerId);
    if (!partner) return;

    setProcessingId(disaster.id);
    try {
      await updateDisasterStatus(
        disaster.id, 
        'admin_approved', 
        'manual', 
        'Disetujui manual oleh Admin Operasional',
        partner.id,
        partner.name
      );
      await addAuditLog({
        id: `audit-${Date.now()}`,
        actorId: staffSession?.email || 'admin',
        actorRole: 'admin',
        actorEmail: staffSession?.email || 'bersamakita.my.id@protonmail.com',
        action: 'BMKG_MANUAL_APPROVE',
        entityType: 'disaster',
        entityId: disaster.id,
        before: { status: disaster.status },
        after: { status: 'admin_approved', verificationMethod: 'manual', partnerId: partner.id, partnerName: partner.name },
        timestamp: new Date().toISOString(),
      });
      showToast('Bencana disetujui (Admin Approved)! Kini tampil di Dashboard User.', 'success');
      onStatusUpdated();
    } catch (err: any) {
      showToast('Gagal memverifikasi: ' + err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (disaster: Disaster) => {
    setProcessingId(disaster.id);
    try {
      await updateDisasterStatus(disaster.id, 'rejected', 'manual', 'Ditolak oleh Admin');
      await addAuditLog({
        id: `audit-${Date.now()}`,
        actorId: staffSession?.email || 'admin',
        actorRole: 'admin',
        actorEmail: staffSession?.email || 'bersamakita.my.id@protonmail.com',
        action: 'BMKG_REJECT',
        entityType: 'disaster',
        entityId: disaster.id,
        before: { status: disaster.status },
        after: { status: 'rejected' },
        timestamp: new Date().toISOString(),
      });
      showToast('Data bencana ditolak (Rejected) — tidak akan tampil ke user', 'warning');
      onStatusUpdated();
    } catch (err: any) {
      showToast('Gagal menolak: ' + err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };



  const handleUpdatePartner = async (disaster: Disaster) => {
    const partnerId = selectedPartners[disaster.id] ?? disaster.partnerId;
    const partner = partners.find((p) => p.id === partnerId);
    if (!partner) {
      showToast('Mitra Lapangan tidak ditemukan!', 'error');
      return;
    }
    if (partnerId === disaster.partnerId) {
      showToast('Tidak ada perubahan mitra', 'info');
      return;
    }

    setProcessingId(disaster.id);
    try {
      await updateDisasterPartner(disaster.id, partner.id, partner.name);
      await addAuditLog({
        id: `audit-${Date.now()}`,
        actorId: staffSession?.email || 'admin',
        actorRole: 'admin',
        actorEmail: staffSession?.email || 'bersamakita.my.id@protonmail.com',
        action: 'DISASTER_PARTNER_UPDATED',
        entityType: 'disaster',
        entityId: disaster.id,
        before: { partnerId: disaster.partnerId, partnerName: disaster.partnerName },
        after: { partnerId: partner.id, partnerName: partner.name },
        timestamp: new Date().toISOString(),
      });
      showToast(`Mitra penanggung jawab diubah ke ${partner.name}`, 'success');
      onStatusUpdated();
    } catch (err: any) {
      showToast('Gagal mengubah mitra: ' + err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCloseFundraising = async (disaster: Disaster) => {
    const confirmed = window.confirm(
      `Tutup penggalangan dana untuk "${disaster.title}"? Bencana tidak lagi tampil ke user, namun riwayat donasi tetap tersimpan dan bisa dibuka kembali.`
    );
    if (!confirmed) return;

    setProcessingId(disaster.id);
    try {
      await updateDisasterStatus(
        disaster.id,
        'archived',
        'manual',
        'Penggalangan dihentikan oleh Admin',
        disaster.partnerId,
        disaster.partnerName
      );
      await addAuditLog({
        id: `audit-${Date.now()}`,
        actorId: staffSession?.email || 'admin',
        actorRole: 'admin',
        actorEmail: staffSession?.email || 'bersamakita.my.id@protonmail.com',
        action: 'DISASTER_FUNDRAISING_CLOSED',
        entityType: 'disaster',
        entityId: disaster.id,
        before: { status: disaster.status },
        after: { status: 'archived' },
        timestamp: new Date().toISOString(),
      });
      showToast('Penggalangan ditutup — bencana tidak lagi tampil ke user', 'success');
      onStatusUpdated();
    } catch (err: any) {
      showToast('Gagal menutup penggalangan: ' + err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReopenFundraising = async (disaster: Disaster) => {
    const partnerId = selectedPartners[disaster.id] ?? disaster.partnerId;
    const partner = partners.find((p) => p.id === partnerId);
    if (!partner) {
      showToast('Wajib memilih Mitra Lapangan sebelum membuka kembali!', 'error');
      return;
    }

    setProcessingId(disaster.id);
    try {
      await updateDisasterStatus(
        disaster.id,
        'admin_approved',
        'manual',
        'Penggalangan dibuka kembali oleh Admin',
        partner.id,
        partner.name
      );
      await addAuditLog({
        id: `audit-${Date.now()}`,
        actorId: staffSession?.email || 'admin',
        actorRole: 'admin',
        actorEmail: staffSession?.email || 'bersamakita.my.id@protonmail.com',
        action: 'DISASTER_FUNDRAISING_REOPENED',
        entityType: 'disaster',
        entityId: disaster.id,
        before: { status: disaster.status },
        after: { status: 'admin_approved', partnerId: partner.id, partnerName: partner.name },
        timestamp: new Date().toISOString(),
      });
      showToast('Penggalangan dibuka kembali — tampil di Dashboard User', 'success');
      onStatusUpdated();
    } catch (err: any) {
      showToast('Gagal membuka kembali: ' + err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshBMKG();
      showToast('Data BMKG berhasil disinkronisasi ke antrean admin', 'success');
    } catch (err: any) {
      showToast('Gagal menyinkronkan BMKG: ' + err.message, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#1B3322] uppercase tracking-wider mb-1">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>Pusat Verifikasi Data Bencana BMKG</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Verifikasi & Sinkronisasi Bencana</h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl leading-relaxed">
            Data BMKG masuk ke panel admin dalam status <strong>Pending Verification</strong>. Data hanya muncul di Dashboard User setelah disetujui Admin dengan penunjukan Mitra Lapangan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sync BMKG Button */}
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 bg-white transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Tarik Data BMKG</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: `Semua (${disasters.length})` },
          {
            id: 'pending',
            label: `Menunggu Verifikasi (${disasters.filter((d) => d.status === 'pending_verification').length})`,
          },
          {
            id: 'approved',
            label: `Terverifikasi Publik (${
              disasters.filter((d) => PUBLIC_STATUSES.includes(d.status)).length
            })`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              filter === tab.id
                ? 'bg-[#1B3322] text-[#B2D850] shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Disasters List */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3">
          <Activity className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Belum Ada Data Bencana di Kategori Ini</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Klik tombol "Tarik Data BMKG" di atas untuk mengambil data gempa terkini langsung dari BMKG ke antrean admin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((disaster) => {
            const isPending = disaster.status === 'pending_verification';
            const isArchived = disaster.status === 'archived';
            const isApproved = PUBLIC_STATUSES.includes(disaster.status);
            const isProcessing = processingId === disaster.id;
            const assignedPartner = partners.find((p) => p.id === disaster.partnerId);
            const partnerOptions = partners.filter(
              (p) => p.status === 'active' || p.id === disaster.partnerId
            );
            const editPartnerValue = selectedPartners[disaster.id] ?? disaster.partnerId ?? '';
            const canSavePartner =
              isApproved &&
              editPartnerValue &&
              editPartnerValue !== disaster.partnerId;

            const createdAt = disaster.createdAt ? new Date(disaster.createdAt).getTime() : Date.now();
            const ageHours = (Date.now() - createdAt) / (1000 * 60 * 60);
            const remainingHours = Math.max(0, 24 - ageHours);

            return (
              <div
                key={disaster.id}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                        {disaster.magnitude} SR
                      </span>
                      <span className="text-xs text-slate-400 font-mono">Kedalaman {disaster.depth}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{disaster.title}</h3>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] font-bold px-3 py-1 rounded-full shrink-0 ${
                      isPending
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : isArchived
                        ? 'bg-slate-100 text-slate-600 border border-slate-300'
                        : isApproved
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-100'
                    }`}
                  >
                    {isPending
                      ? 'Pending Verification'
                      : isArchived
                      ? 'Penggalangan Ditutup'
                      : disaster.status === 'auto_approved'
                      ? 'Auto Approved (24h)'
                      : disaster.status === 'admin_approved'
                      ? 'Admin Approved'
                      : disaster.status}
                  </span>
                </div>

                {/* Location & Time info */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{disaster.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Waktu Gempa: {disaster.eventTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                    <Activity className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Koordinat: {disaster.coordinates?.latitude}, {disaster.coordinates?.longitude}</span>
                  </div>

                  {/* 24-Hour Timer Status */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Usia data dalam antrean:</span>
                      <span className="font-mono font-bold text-slate-700">
                        {ageHours < 1 ? `${Math.round(ageHours * 60)} menit` : `${ageHours.toFixed(1)} jam`}
                      </span>
                    </div>

                    {isPending ? (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-amber-700 font-medium">Batas auto-approve:</span>
                        <span className="font-mono font-bold text-amber-800">
                          {remainingHours > 0 ? `Sisa ${remainingHours.toFixed(1)} jam` : 'Siap Auto-Approve'}
                        </span>
                      </div>
                    ) : isArchived ? (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-medium">Status di User:</span>
                        <span className="font-semibold text-slate-700">Penggalangan Ditutup — Tidak Tampil</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-700 font-medium">Status di User:</span>
                        <span className="font-semibold text-emerald-800">Tampil di Dashboard User</span>
                      </div>
                    )}
                  </div>

                  {disaster.notes && (
                    <div className="pt-1.5 border-t border-slate-200 text-[11px] text-slate-600 italic">
                      Catatan: {disaster.notes}
                    </div>
                  )}
                </div>

                {/* Admin Actions */}
                {isPending && (
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">Pilih Mitra Lapangan (Wajib)</label>
                      <select
                        className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        value={selectedPartners[disaster.id] || ''}
                        onChange={(e) => setSelectedPartners(prev => ({ ...prev, [disaster.id]: e.target.value }))}
                      >
                        <option value="" disabled>-- Pilih Mitra --</option>
                        {partners.filter(p => p.status === 'active').map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleApprove(disaster)}
                        disabled={isProcessing || !selectedPartners[disaster.id]}
                        className="flex-1 py-2 px-3 rounded-full bg-[#1B3322] hover:bg-[#243E2C] disabled:opacity-50 disabled:cursor-not-allowed text-[#B2D850] text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Manual</span>
                      </button>

                      <button
                        onClick={() => handleReject(disaster)}
                        disabled={isProcessing}
                        className="py-2 px-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-all"
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                )}

                {/* Approved / Closed: Partner info, partner edit, close-reopen controls */}
                {isApproved && (
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <label className="text-xs font-bold text-slate-700">
                        Mitra Lapangan Penanggung Jawab
                      </label>
                    </div>

                    {assignedPartner ? (
                      <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                        {assignedPartner.logo ? (
                          <img
                            src={assignedPartner.logo}
                            alt={assignedPartner.name}
                            className="w-9 h-9 rounded-xl object-cover bg-white border border-emerald-100 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-[#1B3322] text-[#B2D850] flex items-center justify-center text-xs font-extrabold shrink-0">
                            {assignedPartner.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-900 truncate">
                            {assignedPartner.name}
                          </p>
                          <p className="text-[10px] text-emerald-700 truncate">
                            {assignedPartner.organization || assignedPartner.location || 'Mitra Lapangan'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Belum ada mitra — pilih mitra di bawah lalu simpan.</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Ubah Mitra Lapangan (Wajib)
                      </label>
                      <select
                        className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        value={editPartnerValue}
                        onChange={(e) =>
                          setSelectedPartners((prev) => ({ ...prev, [disaster.id]: e.target.value }))
                        }
                        disabled={isProcessing}
                      >
                        <option value="" disabled>
                          -- Pilih Mitra --
                        </option>
                        {partnerOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleUpdatePartner(disaster)}
                        disabled={isProcessing || !canSavePartner}
                        className="flex-1 py-2 px-3 rounded-full bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan Mitra</span>
                      </button>

                      {isArchived ? (
                        <button
                          onClick={() => handleReopenFundraising(disaster)}
                          disabled={isProcessing}
                          className="flex-1 py-2 px-3 rounded-full bg-[#1B3322] hover:bg-[#243E2C] disabled:opacity-50 disabled:cursor-not-allowed text-[#B2D850] text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Buka Kembali Penggalangan</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCloseFundraising(disaster)}
                          disabled={isProcessing}
                          className="flex-1 py-2 px-3 rounded-full bg-rose-50 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed text-rose-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Tutup Penggalangan</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
