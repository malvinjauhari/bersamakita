import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Plus,
  FileCheck2,
  Clock,
  MapPin,
  AlertCircle,
  Edit3,
  Loader2,
  Package,
  Image as ImageIcon,
  Heart,
  LogOut,
  ArrowLeft,
  ListTodo,
} from 'lucide-react';
import {
  PartnerAllocation,
  DistributionReport,
  DistributionItem,
  Donation,
  Disaster,
} from '../../types';
import {
  confirmAllocationReceipt,
  updateAllocationStatus,
  saveDistributionReport,
  addAuditLog,
  addTrackingEvent,
  createPartnerAllocation,
} from '../../services/firebase/firestore';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/feedback/Toast';
import { ImageUploadField } from '../../components/ImageUploadField';
import { formatRupiah, formatDateIndo } from '../../lib/utils';
import { DistributionProgressCard } from '../distribution/DistributionProgressCard';

interface PartnerDashboardViewProps {
  allocations: PartnerAllocation[];
  reports: DistributionReport[];
  donations?: Donation[];
  disasters?: Disaster[];
  onDataChanged: () => void;
}

export const PartnerDashboardView: React.FC<PartnerDashboardViewProps> = ({
  allocations,
  reports,
  donations = [],
  disasters = [],
  onDataChanged,
}) => {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { staffSession, isPartnerAuthenticated, logoutStaff } = useAuth();
  const { showToast } = useToast();

  // ROUTE PROTECTION: Akses /partner WAJIB melalui autentikasi partner di /partner/auth
  if (!isPartnerAuthenticated) {
    return <Navigate to="/partner/auth" replace />;
  }

  const currentPath = routerLocation.pathname;
  let activeTab: 'all' | 'tasks' | 'distribution' | 'reports' = 'all';
  if (currentPath.includes('/distribution')) {
    activeTab = 'distribution';
  } else if (currentPath.includes('/reports')) {
    activeTab = 'reports';
  } else if (currentPath.includes('/tasks')) {
    activeTab = 'tasks';
  }

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [selectedAllocation, setSelectedAllocation] = useState<PartnerAllocation | null>(null);
  const [editingReport, setEditingReport] = useState<DistributionReport | null>(null);

  // Form states for distribution report
  const [location, setLocation] = useState<string>('');
  const [distributionDate, setDistributionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<DistributionItem[]>([
    { name: 'Paket Sembako & Beras', quantity: 100, unit: 'paket' },
  ]);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoPublicId, setPhotoPublicId] = useState<string>('');
  const [photoUploading, setPhotoUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Filter donations that are paid
  const paidDonations = donations.filter((d) => d.status === 'paid');
  const totalDonationsPaid = paidDonations.reduce((sum, d) => sum + d.amount, 0);

  // Partner's total allocated funds
  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const totalReceived = allocations
    .filter((a) => a.status === 'funds_received' || a.status === 'in_distribution' || a.status === 'completed')
    .reduce((sum, a) => sum + a.amount, 0);

  const handleConfirmReceived = async (alloc: PartnerAllocation) => {
    setConfirmingId(alloc.id);
    try {
      await confirmAllocationReceipt(alloc.id);
      await addAuditLog({
        id: `audit-${Date.now()}`,
        actorId: staffSession?.email || 'partner',
        actorRole: 'partner',
        actorEmail: staffSession?.email || 'partnerbersamakita@protonmail.com',
        action: 'PARTNER_FUNDS_CONFIRMED',
        entityType: 'partnerAllocation',
        entityId: alloc.id,
        before: { status: alloc.status },
        after: { status: 'funds_received', receivedAt: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });

      // Synchronize tracking event for each source donation
      if (alloc.sourceDonationIds && alloc.sourceDonationIds.length > 0) {
        for (const donId of alloc.sourceDonationIds) {
          await addTrackingEvent({
            id: `trk-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            donationId: donId,
            type: 'funds_received_by_partner',
            title: 'Mitra Lapangan Mengonfirmasi Penerimaan Dana',
            description: `Mitra ${alloc.partnerName} telah mengonfirmasi bahwa dana bantuan ${formatRupiah(alloc.amount)} telah diterima dan proses pengadaan logistik dimulai.`,
            visibleToUser: true,
            createdBy: staffSession?.email || 'partner',
            timestamp: new Date().toISOString(),
          });
        }
      }

      showToast(`Dana alokasi ${formatRupiah(alloc.amount)} berhasil dikonfirmasi diterima`, 'success');
      onDataChanged();
    } catch (err: any) {
      showToast('Gagal konfirmasi: ' + err.message, 'error');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleStartDistributionFromDonation = async (don: Donation) => {
    try {
      const allocId = `alloc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newAlloc: PartnerAllocation = {
        id: allocId,
        disbursementId: `disb-${Date.now()}`,
        partnerId: staffSession?.email || 'partner-pmi',
        partnerName: staffSession?.name || 'Mitra Lapangan Terpadu',
        ...(don.disasterId ? { disasterId: don.disasterId } : {}),
        ...(don.disasterTitle ? { disasterTitle: don.disasterTitle } : {}),
        amount: don.amount,
        sourceDonationIds: [don.id],
        status: 'funds_received',
        allocatedAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await createPartnerAllocation(newAlloc);

      await addTrackingEvent({
        id: `trk-start-${Date.now()}`,
        donationId: don.id,
        type: 'distribution_started',
        title: 'Mitra Lapangan Menyiapkan Penyaluran Bantuan',
        description: `Mitra ${newAlloc.partnerName} telah menerima mandat dan dana donasi ${formatRupiah(don.amount)} untuk segera disalurkan ke posko lapangan.`,
        visibleToUser: true,
        createdBy: staffSession?.email || 'partner',
        timestamp: new Date().toISOString(),
      });

      showToast(`Tugas penyaluran untuk donasi ${formatRupiah(don.amount)} berhasil disiapkan!`, 'success');
      onDataChanged();
      openCreateReport(newAlloc);
    } catch (err: any) {
      showToast('Gagal menyiapkan tugas distribusi: ' + err.message, 'error');
    }
  };

  const openCreateReport = (alloc: PartnerAllocation) => {
    setSelectedAllocation(alloc);
    setEditingReport(null);
    setLocation(staffSession?.name ? `Posko ${staffSession.name}` : 'Posko Bencana Lapangan');
    setNotes('');
    setItems([{ name: 'Paket Beras & Logistik', quantity: 150, unit: 'paket' }]);
    setPhotoUrl('');
    setPhotoPublicId('');
    setShowReportModal(true);
  };

  const openEditReport = (rep: DistributionReport) => {
    setEditingReport(rep);
    setSelectedAllocation(allocations.find((a) => a.id === rep.allocationId) || null);
    setLocation(rep.location);
    setDistributionDate(rep.distributionDate);
    setNotes(rep.notes);
    setItems(rep.items || [{ name: 'Logistik', quantity: 10, unit: 'paket' }]);
    setPhotoUrl(rep.photoUrls?.[0] || '');
    setPhotoPublicId(rep.photoPublicIds?.[0] || '');
    setShowReportModal(true);
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: '', quantity: 1, unit: 'paket' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof DistributionItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmitReport = async (isDraft: boolean) => {
    if (!location) {
      showToast('Harap isi lokasi pelaksanaan distribusi', 'warning');
      return;
    }

    if (photoUploading) {
      showToast('Tunggu sampai gambar selesai diunggah', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const reportId = editingReport?.id || `rep-${Date.now()}`;
      const status = isDraft ? 'draft' : 'submitted';

      const validItems = items.filter((it) => it.name.trim().length > 0);

      const reportData: DistributionReport = {
        id: reportId,
        partnerId: selectedAllocation?.partnerId || staffSession?.email || 'partner',
        partnerName: selectedAllocation?.partnerName || staffSession?.name || 'Mitra Lapangan',
        allocationId: selectedAllocation?.id || 'alloc-general',
        disbursementId: selectedAllocation?.disbursementId,
        status: status,
        location,
        distributionDate,
        items: validItems,
        notes,
        photoUrls: photoUrl ? [photoUrl] : [],
        photoPublicIds: photoUrl ? [photoPublicId || ''] : [],
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdAt: editingReport?.createdAt || new Date().toISOString(),
      };

      await saveDistributionReport(reportData);

      // If report submitted, advance allocation status to in_distribution or completed
      if (selectedAllocation && !isDraft) {
        await updateAllocationStatus(selectedAllocation.id, 'completed');
      }

      // Synchronize donor tracking events for this distribution
      if (selectedAllocation?.sourceDonationIds && selectedAllocation.sourceDonationIds.length > 0 && !isDraft) {
        for (const donId of selectedAllocation.sourceDonationIds) {
          await addTrackingEvent({
            id: `trk-rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            donationId: donId,
            type: 'distribution_completed',
            title: 'Bantuan Telah Disalurkan ke Warga Terdampak',
            description: `Mitra ${selectedAllocation.partnerName} telah menyalurkan bantuan logistik di ${location}. Dokumentasi foto dan serah terima bantuan telah diverifikasi.`,
            visibleToUser: true,
            createdBy: staffSession?.email || 'partner',
            timestamp: new Date().toISOString(),
          });
        }
      }

      await addAuditLog({
        id: `audit-${Date.now()}`,
        actorId: staffSession?.email || 'partner',
        actorRole: 'partner',
        actorEmail: staffSession?.email || 'partnerbersamakita@protonmail.com',
        action: editingReport ? 'PARTNER_REPORT_EDITED' : 'PARTNER_REPORT_SUBMITTED',
        entityType: 'distributionReport',
        entityId: reportId,
        after: { status, location, itemsCount: validItems.length },
        timestamp: new Date().toISOString(),
      });

      showToast(
        isDraft ? 'Draft laporan berhasil disimpan' : 'Laporan distribusi berhasil dikirim!',
        'success'
      );
      setShowReportModal(false);
      onDataChanged();
    } catch (err: any) {
      showToast('Gagal menyimpan laporan: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                Bersama Kita — Portal Mitra Lapangan
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                MITRA
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              {staffSession?.email || 'partnerbersamakita@protonmail.com'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-900 text-xs font-semibold transition-all border border-transparent"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Lihat Tampilan Donatur</span>
          </button>

          <button
            onClick={() => {
              logoutStaff();
              navigate('/partner/auth');
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Keluar / Logout Mitra"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header and Summary */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4 text-slate-800 w-full">
          <div className="w-full">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Dashboard Mitra Operasional & Distribusi</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 w-full">
              {staffSession?.name || 'Mitra Tanggap Bencana'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 w-full">
              Kelola penerimaan dana alokasi bantuan dan laporkan hasil penyaluran langsung dari lapangan.
            </p>
          </div>
        </div>

        {/* Partner Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => navigate('/partner')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Ringkasan Mitra</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/partner/tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Alokasi & Tugas ({allocations.length})</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/partner/distribution')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'distribution'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Penyaluran Lapangan</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/partner/reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Laporan Distribusi ({reports.length})</span>
          </button>
        </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Donasi Masuk
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {formatRupiah(totalDonationsPaid)}
          </div>
          <span className="text-[10px] text-slate-400">{paidDonations.length} donasi terverifikasi dari donatur</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Dana Dialokasikan
          </span>
          <div className="text-2xl font-bold text-indigo-700 font-mono">
            {formatRupiah(totalAllocated)}
          </div>
          <span className="text-[10px] text-indigo-500">{allocations.length} alokasi penugasan relawan</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Dana Dikonfirmasi Kas Posko
          </span>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {formatRupiah(totalReceived)}
          </div>
          <span className="text-[10px] text-emerald-600">Siap / telah dibelanjakan logistik</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Laporan Distribusi
          </span>
          <div className="text-2xl font-bold text-amber-700 font-mono">
            {reports.length}
          </div>
          <span className="text-[10px] text-amber-600">Terdokumentasi foto & berita acara</span>
        </div>
      </div>

      {/* Donasi Masuk dari Donatur yang Siap Didistribusikan */}
      {(activeTab === 'all' || activeTab === 'distribution') && paidDonations.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden w-full">
          <div className="p-6 border-b border-slate-100 flex flex-col gap-4 w-full">
            <div className="w-full">
              <h3 className="font-bold text-base text-slate-900 w-full">
                Donasi Masuk Siap Didistribusikan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 w-full">
                Dana kontribusi donatur yang telah terverifikasi. Mitra dapat langsung memulai penyiapan logistik dan penyaluran lapangan.
              </p>
            </div>
            <div className="w-full flex justify-end">
              <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {paidDonations.length} Donasi Terkumpul
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {paidDonations.map((don) => {
              const alreadyAllocated = allocations.some((a) => a.sourceDonationIds?.includes(don.id));
              return (
                <div
                  key={don.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-slate-900">
                        {formatRupiah(don.amount)}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Donasi Terverifikasi
                      </span>
                      {alreadyAllocated && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Telah Masuk Penugasan
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span>Donatur: <strong className="text-slate-700">{don.isAnonymous ? 'Hamba Allah' : don.donorName}</strong></span>
                      <span>•</span>
                      <span>Target: <strong className="text-slate-700">{don.disasterTitle || 'Tanggap Darurat'}</strong></span>
                      <span>•</span>
                      <span>{formatDateIndo(don.createdAt)}</span>
                    </div>
                    {don.message && (
                      <p className="text-xs italic text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 max-w-xl">
                        &quot;{don.message}&quot;
                      </p>
                    )}
                  </div>

                  {!alreadyAllocated ? (
                    <button
                      onClick={() => handleStartDistributionFromDonation(don)}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Mulai Penyaluran</span>
                    </button>
                  ) : (
                    <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Dalam Proses Penyaluran</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Allocations Assigned to this Partner with Granular Stepper per task */}
      {(activeTab === 'all' || activeTab === 'tasks' || activeTab === 'distribution') && (
        <div className="space-y-4 w-full">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4 w-full">
            <div className="w-full">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                <ListTodo className="w-4 h-4" />
                <span>Pelaksanaan Penyaluran Lapangan</span>
              </div>
              <h3 className="font-bold text-base text-slate-900 w-full">
                Tugas Penyaluran & Checklist Progres Lapangan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 w-full">
                Perbarui setiap tahapan aktual secara real-time (dikemas, dalam perjalanan, tiba di posko, diserahkan ke warga). Donatur dan admin akan memantau progres Anda secara langsung.
              </p>
            </div>
            <div className="w-full flex justify-end">
              <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                {allocations.length} Tugas Alokasi
              </span>
            </div>
          </div>

          {allocations.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3 shadow-sm">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Belum Ada Alokasi Dana Aktif</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Saat admin melakukan pencairan dana donasi dan menugaskannya kepada organisasi Anda, rinciannya akan tampil di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {allocations.map((alloc) => (
                <DistributionProgressCard
                  key={alloc.id}
                  allocation={alloc}
                  mode="partner"
                  actorEmail={staffSession?.email}
                  actorName={staffSession?.name}
                  onUpdated={onDataChanged}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Distribution Reports List */}
      {(activeTab === 'all' || activeTab === 'reports' || activeTab === 'distribution') && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden w-full">
          <div className="p-6 border-b border-slate-100 flex flex-col gap-4 w-full">
            <h3 className="font-bold text-base text-slate-900 w-full">Laporan Penyaluran yang Telah Dibuat</h3>
            <p className="text-xs text-slate-500 mt-0.5 w-full">
              Laporan berstatus 'Submitted' langsung tampil pada pelacakan donatur untuk transparansi publik.
            </p>
          </div>

          {reports.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              Belum ada laporan distribusi yang diunggah.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reports.map((rep) => (
                <div key={rep.id} className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{rep.location}</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          rep.status === 'submitted' || rep.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {rep.status === 'draft' ? 'Draft' : 'Submitted (Publik)'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">{rep.notes}</p>

                    {/* Items summary */}
                    {rep.items && rep.items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {rep.items.map((it, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium"
                          >
                            {it.name}: {it.quantity} {it.unit}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => openEditReport(rep)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shrink-0"
                  >
                    <Edit3 className="w-3 h-3 text-slate-500" />
                    <span>Edit Laporan</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Buat / Edit Laporan Distribusi */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 text-slate-900 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingReport ? 'Edit Laporan Distribusi' : 'Buat Laporan Distribusi Lapangan'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Catat hasil aktual bantuan yang disalurkan ke korban bencana. Item dan foto dicatat sesuai kondisi riil.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lokasi Distribusi</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Misal: Posko Pengungsian Desa Sukamaju, Cianjur"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0C8F63]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Pelaksanaan</label>
                <input
                  type="date"
                  value={distributionDate}
                  onChange={(e) => setDistributionDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0C8F63] bg-white"
                  required
                />
              </div>

              {/* Items List */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Item Bantuan yang Disalurkan</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-[11px] font-bold text-[#1B3322] hover:underline"
                  >
                    + Tambah Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        placeholder="Nama Item (misal: Beras)"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                      />
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-center"
                      />
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        placeholder="Satuan (kg/paket)"
                        className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-600 px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Penyaluran</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan pelaksanaan penyaluran, kondisi warga, dll..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0C8F63]"
                />
              </div>

              <div>
                <ImageUploadField
                  label="Foto Dokumentasi Penyerahan (Opsional)"
                  value={photoUrl}
                  publicId={photoPublicId}
                  folder="bersamakita/reports"
                  hint="Unggah foto langsung dari perangkat (JPG/PNG/WEBP, maks 5 MB)."
                  onUploadingChange={setPhotoUploading}
                  onChange={(url, publicId) => {
                    setPhotoUrl(url);
                    setPhotoPublicId(publicId || '');
                  }}
                />
              </div>

              {/* Actions: Save Draft vs Submit */}
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  disabled={submitting || photoUploading}
                  onClick={() => handleSubmitReport(true)}
                  className="flex-1 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs disabled:opacity-60"
                >
                  Simpan Draft
                </button>
                <button
                  type="button"
                  disabled={submitting || photoUploading}
                  onClick={() => handleSubmitReport(false)}
                  className="flex-1 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Kirim Laporan (Publik)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
