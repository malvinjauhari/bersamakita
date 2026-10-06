import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ArrowLeft,
  Heart,
  AlertTriangle,
  Package,
  ShieldCheck,
  MapPin,
  Clock,
  Layers,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { Disaster } from '../../types';
import { WideNavbar } from '../../components/layout/WideNavbar';
import { WideFooter } from '../../components/layout/WideFooter';

interface SituationAnalysisPageProps {
  disasters: Disaster[];
}

export const SituationAnalysisPage: React.FC<SituationAnalysisPageProps> = ({
  disasters,
}) => {
  const { disasterId } = useParams<{ disasterId: string }>();
  const navigate = useNavigate();

  const selectedDisaster =
    disasters.find((d) => d.id === disasterId) || disasters[0];

  if (!selectedDisaster) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
        <WideNavbar />
        <div className="p-8 text-center space-y-4">
          <p className="text-slate-600 text-sm">Data bencana tidak ditemukan.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-full bg-[#1B3322] text-[#B2D850] text-xs font-bold"
          >
            Kembali ke Dashboard
          </button>
        </div>
        <WideFooter />
      </div>
    );
  }

  const mag = parseFloat(selectedDisaster.magnitude) || 5.0;
  const depthNum = parseInt(selectedDisaster.depth.replace(/[^0-9]/g, ''), 10) || 10;
  const isShallow = depthNum <= 50;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 selection:bg-[#B2D850] selection:text-[#1B3322]">
      <WideNavbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Back Button & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="space-y-1.5">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Dashboard Bencana</span>
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rule-Based Situation Analysis</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Analisis Situasi: {selectedDisaster.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Asesmen cepat dampak seismik dan rekomendasi alokasi kebutuhan logistik darurat menggunakan formula logika deterministik aturan JavaScript.
            </p>
          </div>

          <button
            onClick={() => navigate(`/transaction/${selectedDisaster.id}`)}
            className="px-6 py-3 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] text-xs font-bold shadow-md transition-all flex items-center gap-2 self-start sm:self-auto hover:scale-[1.02]"
          >
            <Heart className="w-4 h-4 fill-current" />
            <span>Donasi untuk Posko Ini</span>
          </button>
        </div>

        {/* Quick Disaster Metric Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Magnitudo Seismik
            </span>
            <div className="text-2xl font-mono font-extrabold text-slate-900">
              {selectedDisaster.magnitude} SR
            </div>
            <p className="text-xs text-slate-500">
              {mag >= 5.5 ? 'Guncangan Kuat (Bantuan Mendesak)' : 'Guncangan Menengah'}
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Klasifikasi Kedalaman
            </span>
            <div className="text-2xl font-mono font-extrabold text-slate-900">
              {selectedDisaster.depth}
            </div>
            <p className="text-xs text-slate-500">
              {isShallow ? 'Gempa Dangkal (≤ 50 km) - Berpotensi Rusak' : 'Gempa Menengah (> 50 km)'}
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Status Verifikasi
            </span>
            <div className="text-lg font-bold text-emerald-700 capitalize flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{selectedDisaster.status === 'pending_verification' ? 'Pending Verifikasi' : 'Terverifikasi & Aktif'}</span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Waktu: {selectedDisaster.eventTime}
            </p>
          </div>
        </div>

        {/* Evaluation Formula Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-slate-900">
              Rekomendasi Paket Kebutuhan Darurat Lapangan
            </h2>
            <p className="text-xs text-slate-500">
              Dihitung berdasarkan tingkat magnitudo dan karakteristik kedalaman hiposenter.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
                <Package className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs text-slate-900">Pasokan Air Bersih & Sanitasi</h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Prioritas darurat pasca-gempa untuk mencegah wabah penyakit dan memenuhi kebutuhan dasar pengungsi.
              </p>
              <span className="inline-block text-[10px] font-bold text-emerald-700 uppercase">Prioritas Utama</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
                <Package className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs text-slate-900">Sembako & Dapur Umum</h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Beras, makanan instan, minyak goreng, dan susu bayi untuk posko pengungsian terdekat.
              </p>
              <span className="inline-block text-[10px] font-bold text-emerald-700 uppercase">Kebutuhan Pokok</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
                <Package className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs text-slate-900">Terpal, Tenda & Selimut</h3>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Perlindungan hunian sementara bagi warga yang rumahnya mengalami kerusakan fisik.
              </p>
              <span className="inline-block text-[10px] font-bold text-emerald-700 uppercase">Tempat Tinggal</span>
            </div>
          </div>

          {/* Rule-Based Transparency Notice per Section 4 */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Otomatisasi Penilaian Berbasis Aturan (Rule-Based)</p>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Sistem analisis situasi Bersama Kita menggunakan logika deterministik aturan matematika JavaScript (Rule-Based Automation), bukan generative model AI atau machine learning. Hal ini menjamin konsistensi evaluasi tanpa risiko halusinasi data.
              </p>
            </div>
          </div>
        </div>
      </main>

      <WideFooter />
    </div>
  );
};
