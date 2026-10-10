import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  MapPin,
  Clock,
  Layers,
  Activity,
  CheckCircle2,
  Package,
  AlertTriangle,
  ExternalLink,
  BarChart3,
} from 'lucide-react';
import { Disaster } from '../../types';
import { formatShortDateIndo, formatRelativeTime, summarizeDisasterImpact } from '../../lib/utils';
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
            className="px-4 py-2 rounded-xl bg-[#0C8F63] text-white text-xs font-bold"
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 selection:bg-[#0C8F63] selection:text-white">
      <WideNavbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Back Button & Header */}
        <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard Bencana</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Analisis Situasi: {selectedDisaster.location}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Asesmen cepat dampak seismik berdasarkan data parameter gempa yang telah terverifikasi.
          </p>
        </div>

        {/* Quick Disaster Metric Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Magnitudo Seismik
            </span>
            <div className="text-2xl font-mono font-extrabold text-slate-900">
              {selectedDisaster.magnitude} SR
            </div>
            <p className="text-xs text-slate-600">
              {mag >= 5.5 ? 'Guncangan Kuat (Bantuan Mendesak)' : 'Guncangan Menengah'}
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Klasifikasi Kedalaman
            </span>
            <div className="text-2xl font-mono font-extrabold text-slate-900">
              {selectedDisaster.depth}
            </div>
            <p className="text-xs text-slate-600">
              {isShallow ? 'Gempa Dangkal (≤ 50 km) - Berpotensi Rusak' : 'Gempa Menengah (> 50 km)'}
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Waktu Kejadian
            </span>
            <div className="text-lg font-extrabold text-slate-900">
              {formatRelativeTime(selectedDisaster.eventTime)}
            </div>
            <p className="text-xs text-slate-600">
              {formatShortDateIndo(selectedDisaster.eventTime)}
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Status Verifikasi
            </span>
            <div className="text-lg font-bold text-emerald-700 capitalize flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{selectedDisaster.status === 'pending_verification' ? 'Pending Verifikasi' : 'Terverifikasi & Aktif'}</span>
            </div>
            <p className="text-xs text-slate-600">
              Data resmi BMKG
            </p>
          </div>
        </div>

        {/* Ringkasan Dampak */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Ringkasan Dampak</span>
          </span>
          <p className="text-sm text-slate-800 leading-relaxed">
            {summarizeDisasterImpact(selectedDisaster.magnitude, selectedDisaster.depth, selectedDisaster.location)}
          </p>
        </div>

        {/* Informasi Teknis Lengkap */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>Data Teknis Bencana</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1.5">
              <span className="text-slate-600 block">Lokasi / Wilayah</span>
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{selectedDisaster.location}</span>
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-600 block">Koordinat (Lintang, Bujur)</span>
              <span className="font-bold text-slate-900 font-mono">
                {selectedDisaster.coordinates
                  ? `${selectedDisaster.coordinates.latitude.toFixed(4)}, ${selectedDisaster.coordinates.longitude.toFixed(4)}`
                  : '-'}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-600 block">Waktu Kejadian Detail</span>
              <span className="font-bold text-slate-900 font-mono">
                {selectedDisaster.eventTime || '-'}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-600 block">Kedalaman Gempa</span>
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{selectedDisaster.depth}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Rekomendasi Paket Kebutuhan Darurat */}
        <div className="space-y-2">
          <span className="font-bold text-slate-800 block text-sm">
            Rekomendasi Paket Kebutuhan Darurat Lapangan
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center space-y-1">
              <Package className="w-5 h-5 text-emerald-600 mx-auto" />
              <span className="font-bold text-slate-800 block text-sm">Pasokan Air & Sanitasi</span>
              <span className="text-xs text-slate-600">Prioritas Utama</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center space-y-1">
              <Package className="w-5 h-5 text-emerald-600 mx-auto" />
              <span className="font-bold text-slate-800 block text-sm">Sembako & Dapur Umum</span>
              <span className="text-xs text-slate-600">Kebutuhan Pokok</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center space-y-1">
              <Package className="w-5 h-5 text-emerald-600 mx-auto" />
              <span className="font-bold text-slate-800 block text-sm">Terpal & Selimut</span>
              <span className="text-xs text-slate-600">Tempat Pengungsian</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Catatan: Analisis situasi dan estimasi kebutuhan logistik dihitung secara otomatis menggunakan formula aturan matematika JavaScript (Rule-Based), bukan melalui generative model AI.
            </span>
          </div>
        </div>

        {/* Donate CTA — compact, below analysis */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate(`/transaction/${selectedDisaster.id}`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0C8F63] hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>Donasi untuk Posko Ini</span>
          </button>

          <button
            onClick={() => navigate(`/dashboard/katalog`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Lihat Data Bencana Lainnya</span>
          </button>
        </div>
      </main>

      <WideFooter />
    </div>
  );
};