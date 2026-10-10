import React from 'react';
import { Heart, ArrowRight, ShieldCheck, Users, MapPin, Phone } from 'lucide-react';
import { Disaster, Partner } from '../../types';
import { formatRupiah, FUNDRAISING_TARGET } from '../../lib/utils';

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
  const targetNeed = FUNDRAISING_TARGET;
  const percentage = Math.min(100, Math.round((collectedAmount / targetNeed) * 100));

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 text-slate-900 border border-slate-200 shadow-sm relative overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        {/* Left Column (2 cols): Disaster Info & Target Progress */}
        <div className="lg:col-span-2 space-y-5">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>Galang Dana Tanggap Bencana Gempa</span>
          </div>

          {/* Heading */}
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-slate-900">
            {disaster.title}
          </h2>

          {/* Subtitle Description */}
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl font-medium">
            Pusat gempa berada di kedalaman {disaster.depth} ({disaster.location}). Donasi yang terkumpul dihimpun dalam total dana darurat, kemudian dialokasikan secara transparan oleh admin ke kebutuhan riil (pakaian, pangan, obat-obatan) dengan persetujuan partner lapangan.
          </p>

          {/* Financial Progress Bar */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-baseline text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] font-semibold">Total Donasi Terkumpul</span>
                <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-700">
                  {formatRupiah(collectedAmount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[11px] font-semibold">Target Kebutuhan</span>
                <span className="text-base font-bold font-mono text-slate-700">
                  {formatRupiah(targetNeed)}
                </span>
              </div>
            </div>

            {/* Progress Track */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(4, percentage)}%` }}
              />
            </div>

            {/* Subtext */}
            <div className="flex justify-between text-[11px] text-slate-500 font-bold">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>{donorCount} Donatur Telah Berpartisipasi</span>
              </span>
              <span>{percentage}% Tercapai</span>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Fast Action Card */}
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-6 text-slate-900 border border-slate-200 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
                Aksi Nyata Cepat
              </span>
              <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                Berdonasi untuk Posko Ini
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Bebas pilih nominal donasi, mulai Rp10.000.
              </p>
            </div>

            <button
              type="button"
              onClick={onDonateNow}
              className="w-full py-3.5 px-4 rounded-xl bg-[#0C8F63] hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 hover:shadow-md"
            >
              <Heart className="w-4 h-4 fill-current" />
              <span>Donasikan Dana Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium leading-tight">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Escrow terproteksi • Rincian alokasi fisik dilaporkan transparan di Lacak Bantuan.</span>
            </div>
          </div>

          {/* Partner Info Card */}
          {partner && (
            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 text-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                {partner.logo ? (
                  <img src={partner.logo} alt={partner.name} className="w-10 h-10 rounded-xl object-cover bg-white p-0.5 border border-emerald-200" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-200 flex items-center justify-center font-bold text-emerald-800">
                    {partner.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm leading-tight text-slate-900">{partner.name}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700">Mitra Lapangan Resmi</span>
                </div>
              </div>
              
              {partner.description && (
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium line-clamp-3">
                  {partner.description}
                </p>
              )}
              
              <div className="flex flex-col gap-1.5 pt-2 border-t border-emerald-200/60">
                {partner.location && (
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{partner.location}</span>
                  </div>
                )}
                {partner.contact && (
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
