import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Package,
  Truck,
  MapPin,
  HeartHandshake,
  CheckCheck,
  ChevronRight,
  Camera,
  Edit2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Building2,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import { PartnerAllocation, DistributionMilestoneKey, DistributionMilestone, Donation } from '../../types';
import { updateAllocationMilestone, addAuditLog } from '../../integrations/firebase/firestore';
import { formatRupiah, formatDateIndo } from '../../lib/utils';
import { useToast } from '../../components/feedback/Toast';
import { ImageUploadField } from '../../components/ImageUploadField';

export interface DistributionProgressCardProps {
  allocation: PartnerAllocation;
  mode: 'partner' | 'admin' | 'donor';
  donorDonation?: Donation;
  actorEmail?: string;
  actorName?: string;
  onUpdated?: () => void;
}

export interface MilestoneDef {
  key: DistributionMilestoneKey;
  label: string;
  stepNumber: number;
  icon: React.FC<{ className?: string }>;
  defaultDetail: string;
  defaultLocation: string;
  actionText: string;
  quickPills: string[];
}

export const MILESTONE_DEFINITIONS: MilestoneDef[] = [
  {
    key: 'funds_received',
    label: 'Dana Masuk Kas Posko',
    stepNumber: 1,
    icon: CheckCircle2,
    defaultDetail: 'Dana bantuan masuk ke kas posko mitra operasional & siap dibelanjakan logistik.',
    defaultLocation: 'Kas Posko Lapangan Mitra',
    actionText: 'Tandai Dana Masuk Kas Posko',
    quickPills: [
      'Dana masuk kas posko operasional',
      'Verifikasi kas posko siap dibelanjakan logistik',
      'Dana standby di rekening kas darurat mitra',
    ],
  },
  {
    key: 'goods_packed',
    label: 'Sudah Dikemas',
    stepNumber: 2,
    icon: Package,
    defaultDetail: '150 Paket Sembako (Beras 5kg, Minyak, Sarden, Biskuit), Selimut & Hygiene Kit',
    defaultLocation: 'Gudang Logistik & Posko Perakitan',
    actionText: 'Tandai Sudah Dikemas, Berupa....',
    quickPills: [
      '150 Paket Sembako, Beras 5kg & Telur',
      '100 Paket Hygiene Kit & Selimut Darurat',
      'Air Bersih 50 Galon & MPASI Balita',
      'Terpal, Tenda Pengungsi & Alas Tidur',
      'Obat-Obatan, P3K & Makanan Siap Saji',
    ],
  },
  {
    key: 'in_transit',
    label: 'Sudah Tiba di [Tempat]',
    stepNumber: 3,
    icon: Truck,
    defaultDetail: 'Armada logistik telah berangkat dan tiba di wilayah kabupaten/kota terdampak bencana',
    defaultLocation: 'Wilayah Terdampak Bencana (Kab. Aceh Barat / Kab. Cianjur)',
    actionText: 'Tandai Sudah Tiba di [Tempat]',
    quickPills: [
      'Kabupaten Aceh Barat',
      'Kabupaten Pidie Jaya',
      'Kabupaten Cianjur',
      'Kabupaten Lumajang',
      'Wilayah Terdampak Bencana',
    ],
  },
  {
    key: 'arrived_at_posko',
    label: 'Sudah Tiba di Posko [Tempat]',
    stepNumber: 4,
    icon: MapPin,
    defaultDetail: 'Bantuan logistik telah tiba di posko induk penampungan dan diverifikasi oleh koordinator',
    defaultLocation: 'Posko Induk Tanggap Darurat Bencana Lapangan',
    actionText: 'Tandai Sudah Tiba di Posko [Tempat]',
    quickPills: [
      'Posko Induk BPBD Lapangan',
      'Posko Lapangan Palang Merah Indonesia (PMI)',
      'Posko Utama Tanggap Darurat Bencana',
      'Posko Pengungsian Desa / Lapangan Terbuka',
    ],
  },
  {
    key: 'handed_over',
    label: 'Sudah Diserahkan ke Posko / Warga',
    stepNumber: 5,
    icon: HeartHandshake,
    defaultDetail: 'Penyerahan bantuan fisik langsung kepada warga pengungsi dan penyintas di tenda',
    defaultLocation: 'Tenda Penampungan & Titik Serah Terima Pengungsi',
    actionText: 'Tandai Sudah Diserahkan ke Posko / Warga',
    quickPills: [
      'Diserahkan langsung ke 120 KK warga pengungsi',
      'Serah terima resmi ke Koordinator Posko Pengungsian',
      'Pembagian merata ke posko penampungan darurat',
      'Diserahkan kepada lansia, ibu hamil & balita rentan',
    ],
  },
  {
    key: 'completed',
    label: 'Selesai (Tuntas 100%)',
    stepNumber: 6,
    icon: CheckCheck,
    defaultDetail: 'Seluruh paket logistik tuntas disalurkan 100% dan berita acara serah terima resmi telah terverifikasi',
    defaultLocation: 'Posko Wilayah Bencana Lapangan',
    actionText: 'Tandai Penyaluran Selesai 100%',
    quickPills: [
      'Penyaluran tuntas 100% dan berita acara resmi disahkan',
      'Seluruh paket tersalurkan tanpa kendala operasional',
    ],
  },
];

export const DistributionProgressCard: React.FC<DistributionProgressCardProps> = ({
  allocation,
  mode,
  donorDonation,
  actorEmail,
  actorName,
  onUpdated,
}) => {
  const { showToast } = useToast();
  const [updatingStage, setUpdatingStage] = useState<DistributionMilestoneKey | null>(null);
  const [inputDetail, setInputDetail] = useState<string>('');
  const [inputLocation, setInputLocation] = useState<string>('');
  const [inputPhoto, setInputPhoto] = useState<string>('');
  const [inputPhotoPublicId, setInputPhotoPublicId] = useState<string>('');
  const [photoUploading, setPhotoUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Compute completed keys
  const completedKeys = new Set(allocation.milestones?.map((m) => m.key) || []);
  if (allocation.status === 'completed') {
    MILESTONE_DEFINITIONS.forEach((m) => completedKeys.add(m.key));
  } else if (allocation.status === 'funds_received') {
    completedKeys.add('funds_received');
  }

  // Find index of current milestone
  const currentKey =
    allocation.currentMilestone ||
    (allocation.status === 'completed'
      ? 'completed'
      : allocation.status === 'funds_received'
      ? 'funds_received'
      : 'allocated');
  const currentDefIndex = MILESTONE_DEFINITIONS.findIndex((m) => m.key === currentKey);

  const openStageUpdater = (m: MilestoneDef) => {
    setUpdatingStage(m.key);
    setInputDetail(allocation.packedItemsSummary || m.defaultDetail);
    setInputLocation(allocation.targetLocation || m.defaultLocation);
    setInputPhoto(allocation.evidencePhotoUrl || '');
    setInputPhotoPublicId(allocation.evidencePhotoPublicId || '');
    setPhotoUploading(false);
  };

  const handleConfirmStage = async (milestoneKey: DistributionMilestoneKey) => {
    if (photoUploading) {
      showToast('Tunggu sampai gambar selesai diunggah', 'warning');
      return;
    }
    setSaving(true);
    try {
      await updateAllocationMilestone(allocation.id, milestoneKey, {
        detail: inputDetail.trim() || undefined,
        location: inputLocation.trim() || undefined,
        photoUrl: inputPhoto.trim() || undefined,
        photoPublicId: inputPhoto.trim() ? inputPhotoPublicId || undefined : undefined,
        actorEmail: actorEmail || 'partner@bersamakita.org',
        actorName: actorName || allocation.partnerName,
      });

      await addAuditLog({
        id: `audit-${Date.now()}`,
        actorId: actorEmail || 'partner',
        actorRole: 'partner',
        actorEmail: actorEmail || 'partner@bersamakita.org',
        action: 'DISTRIBUTION_MILESTONE_UPDATED',
        entityType: 'partnerAllocation',
        entityId: allocation.id,
        after: { milestoneKey, location: inputLocation, detail: inputDetail },
        timestamp: new Date().toISOString(),
      });

      showToast(`Progres diperbarui ke tahap: ${milestoneKey}`, 'success');
      setUpdatingStage(null);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      showToast('Gagal memperbarui progres: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const percentCompleted = Math.round(
    (completedKeys.size / MILESTONE_DEFINITIONS.length) * 100
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-6">
      {/* Header Info & Progress Bar */}
      <div className="pb-5 border-b border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-400">
                Alokasi: {allocation.id}
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  allocation.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                {allocation.status === 'completed'
                  ? 'Penyaluran Selesai 100%'
                  : 'Dalam Penyaluran Lapangan'}
              </span>
            </div>
            <h4 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {donorDonation
                ? `Donasi Anda: ${formatRupiah(donorDonation.amount)}`
                : `Alokasi Bantuan: ${formatRupiah(allocation.amount)}`}
            </h4>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Mitra Penyalur Resmi:{' '}
                <strong className="text-slate-800">{allocation.partnerName}</strong>
              </span>
            </p>
            {allocation.disasterTitle && (
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Bencana Tujuan: <strong className="text-slate-800">{allocation.disasterTitle}</strong>
                </span>
              </p>
            )}
          </div>

          <div className="sm:text-right space-y-1 bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-100 min-w-[200px]">
            <div className="flex items-center sm:justify-end gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Status Penyaluran</span>
            </div>
            <div className="text-base font-extrabold text-[#1B3322] font-mono">
              {completedKeys.size} dari {MILESTONE_DEFINITIONS.length} Tahap
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentCompleted}%` }}
              />
            </div>
          </div>
        </div>

        {mode === 'partner' && allocation.status !== 'completed' && (
          <div className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-2.5 rounded-2xl font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping shrink-0" />
            <span>
              <strong>Mode Mitra Lapangan:</strong> Anda dapat memperbarui setiap tahapan secara instan dengan mengklik tombol pada alur pelacakan vertikal di bawah.
            </span>
          </div>
        )}
      </div>

      {/* Partner Quick Action Bar (Top Shortcut) */}
      {(mode === 'partner' || mode === 'admin') && allocation.status !== 'completed' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50 border border-indigo-100 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Aksi Cepat Tahap Selanjutnya (Tinggal Klik):</span>
            </span>
            <span className="text-[11px] text-slate-500">
              Klik salah satu tahap untuk konfirmasi instan:
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {MILESTONE_DEFINITIONS.map((def) => {
              const isDone = completedKeys.has(def.key);
              const isNext =
                !isDone &&
                (currentDefIndex === -1 ||
                  def.stepNumber === currentDefIndex + 2 ||
                  (currentDefIndex === 0 && def.stepNumber === 2));
              const DefIcon = def.icon;

              return (
                <button
                  key={def.key}
                  type="button"
                  onClick={() => openStageUpdater(def)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isDone
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : isNext
                      ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:scale-[1.02] ring-2 ring-indigo-200'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <DefIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{def.actionText}</span>
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Shopee-Style Vertical Stepper Flow (Top to Bottom) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              Alur Perjalanan Penyaluran Bantuan
            </span>
            <span className="text-[11px] text-slate-500 block">
              Dilacak secara kronologis berurutan dari atas ke bawah
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {percentCompleted}% Berjalan
          </span>
        </div>

        {/* Vertical Stepper Container */}
        <div className="relative pt-2 pl-2">
          {MILESTONE_DEFINITIONS.map((step, idx) => {
            const isCompleted = completedKeys.has(step.key);
            const isCurrent =
              !isCompleted &&
              (allocation.currentMilestone === step.key ||
                (idx === 0 && completedKeys.size === 0) ||
                (idx > 0 && completedKeys.has(MILESTONE_DEFINITIONS[idx - 1].key)));
            const isUpcoming = !isCompleted && !isCurrent;
            const recordedMilestone = allocation.milestones?.find((m) => m.key === step.key);
            const isLast = idx === MILESTONE_DEFINITIONS.length - 1;
            const StepIcon = step.icon;

            // Details and locations
            const detailText =
              recordedMilestone?.detail ||
              (step.key === 'goods_packed' && allocation.packedItemsSummary
                ? allocation.packedItemsSummary
                : step.defaultDetail);

            const locationText =
              recordedMilestone?.location ||
              allocation.targetLocation ||
              step.defaultLocation;

            const photoUrl =
              recordedMilestone?.photoUrl ||
              (step.key === 'handed_over' || step.key === 'goods_packed' || step.key === 'completed'
                ? allocation.evidencePhotoUrl
                : undefined);

            return (
              <div key={step.key} className="relative flex items-start gap-4 pb-8 group">
                {/* Connecting Vertical Line */}
                {!isLast && (
                  <div
                    className={`absolute left-[19px] top-9 bottom-0 w-0.5 transition-colors ${
                      isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}

                {/* Left Node Indicator */}
                <div className="relative z-10 shrink-0">
                  {isCompleted ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md ring-4 ring-emerald-50">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-10 h-10 rounded-full bg-[#1B3322] text-[#B2D850] flex items-center justify-center shadow-lg ring-4 ring-emerald-200 animate-pulse">
                      <StepIcon className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-slate-300 bg-white text-slate-400 flex items-center justify-center font-mono text-xs font-bold">
                      0{step.stepNumber}
                    </div>
                  )}
                </div>

                {/* Right Step Content Box */}
                <div
                  className={`flex-1 rounded-2xl p-4 sm:p-5 border transition-all ${
                    isCompleted
                      ? 'bg-emerald-50/40 border-emerald-200/80 shadow-xs'
                      : isCurrent
                      ? 'bg-white border-emerald-500/80 shadow-md ring-2 ring-emerald-100'
                      : 'bg-slate-50/60 border-slate-200/70 text-slate-500 opacity-90'
                  }`}
                >
                  {/* Step Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                          Tahap 0{step.stepNumber}
                        </span>
                        <h5
                          className={`text-sm sm:text-base font-extrabold ${
                            isCompleted
                              ? 'text-emerald-950'
                              : isCurrent
                              ? 'text-slate-900'
                              : 'text-slate-600'
                          }`}
                        >
                          {step.label}
                        </h5>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Selesai Terverifikasi</span>
                        </span>
                      ) : isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                          <span>Sedang Berlangsung</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          Menunggu Giliran
                        </span>
                      )}

                      {recordedMilestone?.completedAt && (
                        <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatDateIndo(recordedMilestone.completedAt)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Step Body: Actual Field Description & Location */}
                  <div className="pt-3 space-y-3 text-xs">
                    <p
                      className={`leading-relaxed font-medium ${
                        isCompleted || isCurrent ? 'text-slate-800' : 'text-slate-500'
                      }`}
                    >
                      {detailText}
                    </p>

                    {/* Location Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>Lokasi: {locationText}</span>
                      </div>

                      {isCompleted && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100/60 border border-emerald-200 text-emerald-800 font-medium text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Divalidasi Koordinator Posko</span>
                        </div>
                      )}
                    </div>

                    {/* Photo Documentation Thumbnail if Available */}
                    {photoUrl && (
                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                          Bukti Dokumentasi Aktual Lapangan:
                        </span>
                        <div className="relative inline-block group/img">
                          <img
                            src={photoUrl}
                            alt={`Dokumentasi ${step.label}`}
                            className="h-24 sm:h-28 w-44 sm:w-52 rounded-xl object-cover border border-slate-200 shadow-xs cursor-pointer group-hover/img:opacity-90 transition-opacity"
                            onClick={() => setPreviewPhoto(photoUrl)}
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(photoUrl)}
                            className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-semibold flex items-center gap-1 backdrop-blur-xs cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Perbesar</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Partner Action Button inside step */}
                    {mode === 'partner' && !isCompleted && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => openStageUpdater(step)}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Klik: Tandai Selesai ({step.label})</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Photo Lightbox Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Dokumentasi Aktual Penyaluran Bantuan
                </h4>
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] bg-slate-950 flex items-center justify-center overflow-hidden">
              <img
                src={previewPhoto}
                alt="Dokumentasi Lapangan Full"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="p-4 bg-slate-50 text-xs text-slate-600 flex items-center justify-between">
              <span>Mitra: {allocation.partnerName}</span>
              <a
                href={previewPhoto}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>Buka Gambar Asli</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Partner Quick-Update Modal / Form */}
      {updatingStage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                  Update Progres Lapangan Mitra
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Tandai Tahap: {MILESTONE_DEFINITIONS.find((m) => m.key === updatingStage)?.label}
                </h3>
              </div>
              <button
                onClick={() => setUpdatingStage(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Detail Input with Quick Pills */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Detail / Berupa Apa yang Dikerjakan:
                </label>
                <input
                  type="text"
                  value={inputDetail}
                  onChange={(e) => setInputDetail(e.target.value)}
                  placeholder="Contoh: 150 paket sembako, beras 5kg, selimut hangat"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-xs font-medium"
                />

                {/* 1-Click Fast Fill Pills */}
                {updatingStage && (
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">
                      ⚡ Pilih Cepat Rincian (Tinggal Klik):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {MILESTONE_DEFINITIONS.find((m) => m.key === updatingStage)?.quickPills.map(
                        (pill, pi) => (
                          <button
                            key={pi}
                            type="button"
                            onClick={() => {
                              if (
                                updatingStage === 'in_transit' ||
                                updatingStage === 'arrived_at_posko'
                              ) {
                                setInputLocation(pill);
                              } else {
                                setInputDetail(pill);
                              }
                            }}
                            className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 transition-colors cursor-pointer"
                          >
                            + {pill}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Location Input with Quick Posko suggestions */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">
                  Lokasi / Posko Wilayah Terdampak:
                </label>
                <input
                  type="text"
                  value={inputLocation}
                  onChange={(e) => setInputLocation(e.target.value)}
                  placeholder="Contoh: Posko Utama BPBD / PMI Kab. Aceh Barat"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-xs font-medium"
                />
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInputLocation('Kabupaten Aceh Barat (Posko Utama)')}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium cursor-pointer"
                  >
                    Posko Aceh Barat
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputLocation('Posko Induk Tanggap Darurat Bencana')}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium cursor-pointer"
                  >
                    Posko Induk Bencana
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputLocation('Tenda Pengungsian Warga Penyintas')}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium cursor-pointer"
                  >
                    Tenda Pengungsi
                  </button>
                </div>
              </div>

              {/* Photo Evidence Upload */}
              <div className="space-y-1">
                <ImageUploadField
                  label="Foto Dokumentasi Lapangan:"
                  value={inputPhoto}
                  publicId={inputPhotoPublicId}
                  folder="bersamakita/evidence"
                  hint="Unggah foto langsung dari perangkat (JPG/PNG/WEBP, maks 5 MB)."
                  onUploadingChange={setPhotoUploading}
                  onChange={(url, publicId) => {
                    setInputPhoto(url);
                    setInputPhotoPublicId(publicId || '');
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUpdatingStage(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving || photoUploading}
                onClick={() => handleConfirmStage(updatingStage)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Konfirmasi & Simpan Progres</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
