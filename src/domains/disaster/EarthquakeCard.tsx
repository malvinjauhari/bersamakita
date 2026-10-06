import React from 'react';
import {
  MapPin,
  Layers,
  Clock,
  Building,
  BarChart3,
  Heart,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Disaster } from '../../types';
import { formatRupiah } from '../../lib/utils';

interface EarthquakeCardProps {
  disaster: Disaster;
  isSelected: boolean;
  collectedAmount: number;
  donorCount: number;
  onSelect: () => void;
  onDonate: () => void;
  onAnalyze: () => void;
}

export const EarthquakeCard: React.FC<EarthquakeCardProps> = ({
  disaster,
  isSelected,
  collectedAmount,
  donorCount,
  onSelect,
  onDonate,
  onAnalyze,
}) => {
  const magNum = parseFloat(disaster.magnitude) || 5.0;
  const isUrgent = magNum >= 5.5;
  const isPending = disaster.status === 'pending_verification';

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-3xl p-5 border transition-all cursor-pointer relative shadow-xs hover:shadow-md ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
          : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      {/* Header Badges & Magnitude Pill */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Priority Badge */}
          {isUrgent ? (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Bantuan Mendesak
            </span>
          ) : magNum >= 5.0 ? (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Dalam Penanganan
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              Perlu Perhatian
            </span>
          )}

          {/* Verification Badge */}
          {!isPending ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Terverifikasi & Aktif</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>Menunggu Verifikasi & Pemilihan Mitra</span>
            </span>
          )}
        </div>

        {/* Magnitude Circle */}
        <div className="w-11 h-8 rounded-full border border-slate-200 bg-slate-50/80 flex items-center justify-center font-mono text-xs font-bold text-slate-800 shrink-0">
          <span className="text-[10px] text-slate-400 mr-0.5">M</span>
          <span className="text-emerald-700 font-extrabold">{disaster.magnitude}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-extrabold text-slate-900 text-sm leading-snug mb-3 line-clamp-2">
        {disaster.title}
      </h3>

      {/* 4-Item Grid Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-3 text-xs text-slate-500 mb-4 bg-slate-50/60 p-3 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2 truncate">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{disaster.location}</span>
        </div>

        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Kedalaman: <strong className="text-slate-700">{disaster.depth}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">Waktu: <strong className="text-slate-700">{disaster.eventTime}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">Data resmi dihimpun BMKG</span>
        </div>
      </div>

      {/* Bottom Row: Stats & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
        <div>
          <span className="text-[10px] text-slate-400 block font-medium">Total Dana Terkumpul:</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-xs font-extrabold text-slate-900">
              {formatRupiah(collectedAmount)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Partisipasi: <strong className="text-slate-700">{donorCount} Donatur</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAnalyze();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Analisis Situasi</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDonate();
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>Donasi Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
