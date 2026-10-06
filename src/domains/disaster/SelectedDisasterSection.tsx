import React from 'react';
import { Heart, ArrowRight, ShieldCheck, Users, MapPin, Phone } from 'lucide-react';
import { Disaster, Partner } from '../../types';
import { formatRupiah } from '../../lib/utils';

interface SelectedDisasterSectionProps {
  disaster: Disaster;
  collectedAmount: number;
  donorCount: number;
  partner?: Partner;
  onDonateNow: () => void;
}

export const SelectedDisasterSection: React.FC<SelectedDisasterSectionProps> = ({
  disaster,
  collectedAmount,
  donorCount,
  partner,
  onDonateNow,
}) => {
  const targetNeed = 50000000; // Rp 50.000.000 target posko tanggap darurat
  const percentage = Math.min(100, Math.round((collectedAmount / targetNeed) * 100));

  return (
    <div className="bg-[#1B3322] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        {/* Left Column (2 cols): Disaster Info & Target Progress */}
        <div className="lg:col-span-2 space-y-5">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 text-[#B2D850] text-xs font-semibold backdrop-blur-xs border border-white/15">
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>Galang Dana Tanggap Bencana Gempa</span>
          </div>

          {/* Heading */}
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            {disaster.title}
          </h2>

          {/* Subtitle Description */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl font-normal">
            Pusat gempa berada di kedalaman {disaster.depth} ({disaster.location}). Donasi yang terkumpul dihimpun dalam total dana darurat, kemudian dialokasikan secara transparan oleh admin ke kebutuhan riil (pakaian, pangan, obat-obatan) dengan persetujuan partner lapangan.
          </p>

          {/* Financial Progress Bar */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-baseline text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Total Donasi Terkumpul</span>
                <span className="text-xl sm:text-2xl font-extrabold font-mono text-white">
                  {formatRupiah(collectedAmount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Target Kebutuhan</span>
                <span className="text-base font-bold font-mono text-slate-300">
                  {formatRupiah(targetNeed)}
                </span>
              </div>
            </div>

            {/* Progress Track */}
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#B2D850] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(4, percentage)}%` }}
              />
            </div>

            {/* Subtext */}
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>{donorCount} Donatur Telah Berpartisipasi</span>
              </span>
              <span>{percentage}% Tercapai</span>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Fast Action White Card */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 text-slate-900 shadow-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Aksi Nyata Cepat
              </span>
              <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                Berdonasi untuk Posko Ini
              </h3>
              <p className="text-xs text-slate-500">
                Bebas pilih nominal donasi, mulai Rp10.000.
              </p>
            </div>

            <button
              type="button"
              onClick={onDonateNow}
              className="w-full py-3.5 px-4 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Heart className="w-4 h-4 fill-current" />
              <span>Donasikan Dana Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-500 leading-tight">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Escrow terproteksi • Rincian alokasi fisik dilaporkan transparan di Lacak Bantuan.</span>
            </div>
          </div>

          {/* Partner Info Card */}
          {partner && (
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 border border-white/20 text-white space-y-3">
              <div className="flex items-center gap-3">
                {partner.logo ? (
                  <img src={partner.logo} alt={partner.name} className="w-10 h-10 rounded-full object-cover bg-white p-0.5" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white">
                    {partner.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm leading-tight">{partner.name}</span>
                    <ShieldCheck className="w-3 h-3 text-[#B2D850]" />
                  </div>
                  <span className="text-[10px] text-slate-300">Mitra Lapangan Resmi</span>
                </div>
              </div>
              
              {partner.description && (
                <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                  {partner.description}
                </p>
              )}
              
              <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
                {partner.location && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-[#B2D850] shrink-0" />
                    <span className="truncate">{partner.location}</span>
                  </div>
                )}
                {partner.contact && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-[#B2D850] shrink-0" />
                    <span className="truncate">{partner.contact}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
