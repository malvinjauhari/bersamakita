import React from 'react';
import { X, BarChart3, ShieldCheck, AlertTriangle, Package, Heart, MapPin, ExternalLink } from 'lucide-react';
import { Disaster } from '../../types';
import { formatShortDateIndo, formatRelativeTime } from '../../lib/utils';

interface AnalisisSituasiModalProps {
  disaster: Disaster | null;
  onClose: () => void;
  onDonate: (disasterId: string) => void;
  onOpenFullAnalysis?: (disasterId: string) => void;
}

export const AnalisisSituasiModal: React.FC<AnalisisSituasiModalProps> = ({
  disaster,
  onClose,
  onDonate,
  onOpenFullAnalysis,
}) => {
  if (!disaster) return null;

  const mag = parseFloat(disaster.magnitude) || 5.0;
  const isShallow = parseInt(disaster.depth.replace(/[^0-9]/g, ''), 10) <= 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 text-slate-900 shadow-2xl relative border border-slate-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-500 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1 text-xs font-bold text-emerald-800 uppercase tracking-wider">
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <span>Detail & Analisis Situasi</span>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-1 leading-snug">
          {disaster.location}
        </h3>
        <p className="text-sm text-slate-600 mb-4">{disaster.title}</p>

        {/* Informasi Teknis Bencana */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs mb-4">
          <span className="font-bold text-slate-800 block text-xs">
            Informasi Teknis Bencana:
          </span>
          <div className="space-y-1.5 text-slate-700">
            <div className="flex justify-between py-1 border-b border-slate-200/70">
              <span>Terjadi</span>
              <span className="font-bold text-slate-900">
                {disaster.eventTime ? `${formatRelativeTime(disaster.eventTime)} (${formatShortDateIndo(disaster.eventTime)})` : '-'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/70">
              <span>Kedalaman</span>
              <span className="font-bold text-slate-900">{disaster.depth}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/70">
              <span>Koordinat</span>
              <span className="font-mono font-bold text-slate-900">
                {disaster.coordinates
                  ? `${disaster.coordinates.latitude.toFixed(4)}, ${disaster.coordinates.longitude.toFixed(4)}`
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/70">
              <span>Lokasi / Wilayah</span>
              <span className="font-semibold text-slate-800 text-right flex items-center gap-1">
                <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                <span className="truncate max-w-[200px]">{disaster.location}</span>
              </span>
            </div>
            {onOpenFullAnalysis && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullAnalysis(disaster.id);
                }}
                className="w-full mt-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Analisis Lengkap</span>
              </button>
            )}
          </div>
        </div>

        {/* Rule Evaluation Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 mb-4">
          <span className="font-bold text-slate-800 block text-xs">
            Karakteristik & Indikator Bencana:
          </span>
          <div className="space-y-1.5 text-slate-700">
            <div className="flex justify-between py-1 border-b border-slate-200/70">
              <span>Magnitudo Seismik:</span>
              <span className="font-mono font-bold text-slate-900">{disaster.magnitude} SR</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/70">
              <span>Klasifikasi Kedalaman:</span>
              <span className="font-semibold text-slate-800">
                {isShallow ? 'Gempa Dangkal (≤ 50 km) - Berpotensi Rusak' : 'Gempa Menengah (> 50 km)'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/70">
              <span>Status Verifikasi:</span>
              <span className="font-semibold text-emerald-700 capitalize">
                {disaster.status === 'pending_verification' ? 'Pending Verifikasi' : 'Terverifikasi & Aktif'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>Metode Asesmen:</span>
              <span className="font-mono text-slate-700">Rule-Based Automation (Deterministic)</span>
            </div>
          </div>
        </div>

        {/* Priority Aid Recommendations */}
        <div className="space-y-2 mb-4">
          <span className="font-bold text-slate-800 block text-xs">
            Rekomendasi Paket Kebutuhan Darurat Lapangan:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center space-y-1">
              <Package className="w-4 h-4 text-emerald-600 mx-auto" />
              <span className="font-bold text-slate-800 block text-[11px]">Pasokan Air & Sanitasi</span>
              <span className="text-[11px] text-slate-600">Prioritas Utama</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center space-y-1">
              <Package className="w-4 h-4 text-emerald-600 mx-auto" />
              <span className="font-bold text-slate-800 block text-[11px]">Sembako & Dapur Umum</span>
              <span className="text-[11px] text-slate-600">Kebutuhan Pokok</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center space-y-1">
              <Package className="w-4 h-4 text-emerald-600 mx-auto" />
              <span className="font-bold text-slate-800 block text-[11px]">Terpal & Selimut</span>
              <span className="text-[11px] text-slate-600">Tempat Pengungsian</span>
            </div>
          </div>
        </div>

        {/* Deterministic Logic Notice per Section 4 */}
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Catatan: Analisis situasi dan estimasi kebutuhan logistik dihitung secara otomatis menggunakan formula aturan matematika JavaScript (Rule-Based), bukan melalui generative model AI.
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={() => {
            onClose();
            onDonate(disaster.id);
          }}
          className="w-full py-3 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#0C8F63] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
        >
          <Heart className="w-4 h-4 fill-current" />
          <span>Bantu Posko Ini Sekarang</span>
        </button>
      </div>
    </div>
  );
};