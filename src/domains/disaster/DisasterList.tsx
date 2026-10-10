import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  MapPin,
  Clock,
  Heart,
  Radio,
  ShieldCheck,
  BarChart3,
  Users,
  CircleAlert,
} from 'lucide-react';
import { Disaster, Donation, Partner } from '../../types';
import {
  formatRupiah,
  formatRelativeTime,
  FUNDRAISING_TARGET,
  summarizeDisasterImpact,
} from '../../lib/utils';

interface DisasterListProps {
  disasters: Disaster[];
  donations: Donation[];
  partners: Partner[];
  onDonateForDisaster: (disasterId: string) => void;
}

export const DisasterList: React.FC<DisasterListProps> = ({
  disasters,
  donations,
  partners,
  onDonateForDisaster,
}) => {
  const navigate = useNavigate();

  // Strict rule: user only sees approved / published disasters
  const publishedDisasters = disasters.filter((d) =>
    ['admin_approved', 'auto_approved', 'published'].includes(d.status)
  );

  const getDisasterDonations = (disasterId: string) => {
    const matched = donations.filter((d) => d.disasterId === disasterId && d.status === 'paid');
    const total = matched.reduce((sum, d) => sum + d.amount, 0);
    return { total, count: matched.length };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B3322] uppercase tracking-wider mb-1">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>Data Bencana Terverifikasi Resmi BMKG</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Bencana Gempa Bumi Membutuhkan Penanganan</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Semua data bencana di bawah ini telah diverifikasi validitasnya melalui data seismik resmi BMKG.
          </p>
        </div>
      </div>

      {publishedDisasters.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3">
          <Activity className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Belum Ada Bencana Baru yang Terverifikasi</h3>
          <p className="text-sm text-slate-600 max-w-sm mx-auto">
            Data gempa BMKG akan dipublikasikan secara transparan setelah melalui tahapan verifikasi operasional.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {publishedDisasters.map((disaster) => {
            const stats = getDisasterDonations(disaster.id);
            const magNum = parseFloat(disaster.magnitude) || 5.0;
            const isUrgent = magNum >= 5.5;
            const isHandled = magNum >= 5.0 && magNum < 5.5;
            const percentage = Math.min(
              100,
              Math.round((stats.total / FUNDRAISING_TARGET) * 100)
            );
            const statusPill = isUrgent
              ? { label: 'Mendesak', className: 'bg-rose-100 text-rose-800 border-rose-200' }
              : isHandled
              ? { label: 'Dalam Penanganan', className: 'bg-amber-100 text-amber-900 border-amber-200' }
              : { label: 'Perlu Perhatian', className: 'bg-sky-100 text-sky-800 border-sky-200' };
            const partner = partners.find((p) => p.id === disaster.partnerId);

            return (
              <div
                key={disaster.id}
                className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col"
              >
                {/* Header: Status Label + Magnitude */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusPill.className}`}
                  >
                    {isUrgent && <CircleAlert className="w-3 h-3" />}
                    <span>{statusPill.label}</span>
                  </span>

                  <div className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-slate-600">M</span>
                    <span className="text-sm font-extrabold text-emerald-700 font-mono">
                      {disaster.magnitude}
                    </span>
                  </div>
                </div>

                {/* Nama / Lokasi Bencana */}
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h3 className="font-extrabold text-slate-900 text-lg leading-snug line-clamp-2">
                    {disaster.location}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mb-2 line-clamp-1">{disaster.title}</p>
                <p className="text-xs text-slate-600 mb-4 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Terjadi {formatRelativeTime(disaster.eventTime)}</span>
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
                        {formatRupiah(stats.total)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-700">{percentage}%</span>
                      <span className="text-[11px] text-slate-600 block">
                        dari {formatRupiah(FUNDRAISING_TARGET)}
                      </span>
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
                      <strong className="text-slate-800">{stats.count} donatur</strong> telah berpartisipasi
                    </span>
                  </div>
                </div>

                {/* Partner */}
                {partner && (
                  <div className="flex items-center gap-2 mb-4 text-xs">
                    {partner.logo ? (
                      <img
                        src={partner.logo}
                        alt={partner.name}
                        className="w-6 h-6 rounded-full object-cover bg-white border border-slate-200"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-[10px]">
                        {partner.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-slate-600">Mitra:</span>
                    <span className="font-bold text-slate-800 truncate">{partner.name}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 mt-auto border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/analysis/${disaster.id}`)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Detail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDonateForDisaster(disaster.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] text-xs font-bold transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Heart className="w-3.5 h-3.5 fill-current" />
                    <span>Donasi Sekarang</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};