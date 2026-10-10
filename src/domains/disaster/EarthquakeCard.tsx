import React from 'react';
import {
  MapPin,
  Heart,
  CircleAlert,
  BarChart3,
  Users,
} from 'lucide-react';
import { Disaster } from '../../types';
import { formatRupiah, FUNDRAISING_TARGET, summarizeDisasterImpact } from '../../lib/utils';

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
  const isHandled = magNum >= 5.0 && magNum < 5.5;
  const percentage = Math.min(100, Math.round((collectedAmount / FUNDRAISING_TARGET) * 100));

  const statusPill = isUrgent
    ? { label: 'Mendesak', className: 'bg-rose-100 text-rose-800 border-rose-200' }
    : isHandled
    ? { label: 'Dalam Penanganan', className: 'bg-amber-100 text-amber-900 border-amber-200' }
    : { label: 'Perlu Perhatian', className: 'bg-sky-100 text-sky-800 border-sky-200' };

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all cursor-pointer relative shadow-xs hover:shadow-md ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
          : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      {/* Header: Status Label + Region */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Bencana Aktif
          </span>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
              statusPill.className
            }`}
          >
            {isUrgent && <CircleAlert className="w-3 h-3" />}
            <span>{statusPill.label}</span>
          </span>
        </div>

        {/* Magnitude Chip */}
        <div className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-xs font-bold text-slate-600">M</span>
          <span className="text-sm font-extrabold text-emerald-700 font-mono">
            {disaster.magnitude}
          </span>
        </div>
      </div>

      {/* Nama / Lokasi Bencana */}
      <h3 className="font-extrabold text-slate-900 text-lg leading-snug mb-1 line-clamp-2">
        {disaster.location}
      </h3>
      <p className="text-xs text-slate-600 mb-4 line-clamp-1">
        {disaster.title}
      </p>

      {/* Ringkasan Singkat Dampak */}
      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-4 bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
        {summarizeDisasterImpact(disaster.magnitude, disaster.depth, disaster.location)}
      </p>

      {/* Progress Bar Dana */}
      <div className="space-y-2 mb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              Dana Terkumpul
            </span>
            <span className="font-mono text-base font-extrabold text-slate-900">
              {formatRupiah(collectedAmount)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-700">{percentage}%</span>
            <span className="text-[11px] text-slate-600 block">dari {formatRupiah(FUNDRAISING_TARGET)}</span>
          </div>
        </div>

        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.max(4, percentage)}%` }}
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-0.5">
          <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            <strong className="text-slate-800">{donorCount} donatur</strong> telah berpartisipasi
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAnalyze();
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
        >
          <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
          <span>Detail</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDonate();
          }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0C8F63] hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          <Heart className="w-3.5 h-3.5 fill-current" />
          <span>Donasi Sekarang</span>
        </button>
      </div>
    </div>
  );
};