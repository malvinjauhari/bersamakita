import React from 'react';
import { X, BarChart3, ShieldCheck, AlertTriangle, Package, Heart } from 'lucide-react';
import { Disaster } from '../../types';

interface AnalisisSituasiModalProps {
  disaster: Disaster | null;
  onClose: () => void;
  onDonate: (disasterId: string) => void;
}

export const AnalisisSituasiModal: React.FC<AnalisisSituasiModalProps> = ({
  disaster,
  onClose,
  onDonate,
}) => {
  if (!disaster) return null;

  const mag = parseFloat(disaster.magnitude) || 5.0;
  const isShallow = parseInt(disaster.depth.replace(/[^0-9]/g, ''), 10) <= 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 text-slate-900 shadow-2xl relative border border-slate-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1 text-xs font-bold text-emerald-800 uppercase tracking-wider">
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <span>Rule-Based Situation Analysis</span>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-1 leading-snug">
          {disaster.title}
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Waktu: {disaster.eventTime} • Kedalaman: {disaster.depth}
        </p>

        <div className="space-y-4 text-xs">
          {/* Rule Evaluation Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="font-bold text-slate-800 block text-xs">
              Karakteristik & Indikator Bencana:
            </span>
            <div className="space-y-1.5 text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span>Magnitudo Seismik:</span>
                <span className="font-mono font-bold text-slate-900">{disaster.magnitude} SR</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span>Klasifikasi Kedalaman:</span>
                <span className="font-semibold text-slate-800">
                  {isShallow ? 'Gempa Dangkal (≤ 50 km) - Berpotensi Rusak' : 'Gempa Menengah (> 50 km)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
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
          <div className="space-y-2">
            <span className="font-bold text-slate-800 block text-xs">
              Rekomendasi Paket Kebutuhan Darurat Lapangan:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center space-y-1">
                <Package className="w-4 h-4 text-emerald-600 mx-auto" />
                <span className="font-bold text-slate-800 block text-[11px]">Pasokan Air & Sanitasi</span>
                <span className="text-[10px] text-slate-500">Prioritas Utama</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center space-y-1">
                <Package className="w-4 h-4 text-emerald-600 mx-auto" />
                <span className="font-bold text-slate-800 block text-[11px]">Sembako & Dapur Umum</span>
                <span className="text-[10px] text-slate-500">Kebutuhan Pokok</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center space-y-1">
                <Package className="w-4 h-4 text-emerald-600 mx-auto" />
                <span className="font-bold text-slate-800 block text-[11px]">Terpal & Selimut</span>
                <span className="text-[10px] text-slate-500">Tempat Pengungsian</span>
              </div>
            </div>
          </div>

          {/* Deterministic Logic Notice per Section 4 */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
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
            className="w-full py-3 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Heart className="w-4 h-4 fill-current" />
            <span>Bantu Posko Ini Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
