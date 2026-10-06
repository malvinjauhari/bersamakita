import React from 'react';
import { Activity, MapPin, Clock, Heart, Radio, ShieldCheck, Phone } from 'lucide-react';
import { Disaster, Partner } from '../../types';

interface DisasterListProps {
  disasters: Disaster[];
  partners: Partner[];
  onDonateForDisaster: (disasterId: string) => void;
}

export const DisasterList: React.FC<DisasterListProps> = ({ disasters, partners, onDonateForDisaster }) => {
  // Strict rule: user only sees approved / published disasters
  const publishedDisasters = disasters.filter((d) =>
    ['admin_approved', 'auto_approved', 'published'].includes(d.status)
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B3322] uppercase tracking-wider mb-1">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>Data Bencana Terverifikasi Resmi BMKG</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Bencana Gempa Bumi Membutuhkan Penanganan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Semua data bencana di bawah ini telah diverifikasi validitasnya melalui data seismik resmi BMKG.
          </p>
        </div>
      </div>

      {publishedDisasters.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3">
          <Activity className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Belum Ada Bencana Baru yang Terverifikasi</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Data gempa BMKG akan dipublikasikan secara transparan setelah melalui tahapan verifikasi operasional.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {publishedDisasters.map((disaster) => (
            <div
              key={disaster.id}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-extrabold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                      {disaster.magnitude} SR
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Kedalaman {disaster.depth}</span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Terverifikasi</span>
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base leading-snug">{disaster.title}</h3>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{disaster.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{disaster.eventTime}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                {(() => {
                  const partner = partners.find(p => p.id === disaster.partnerId);
                  if (partner) {
                    return (
                      <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2">
                          {partner.logo ? (
                            <img src={partner.logo} alt={partner.name} className="w-6 h-6 rounded-full object-cover bg-white" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-[10px]">
                              {partner.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-medium leading-none">Mitra Penyalur:</span>
                            <span className="text-xs font-bold text-slate-700 leading-tight">{partner.name}</span>
                          </div>
                        </div>
                        {partner.description && (
                          <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                            {partner.description}
                          </p>
                        )}
                        <div className="flex flex-col gap-1 text-[10px] text-slate-500">
                          {partner.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{partner.location}</span>
                            </div>
                          )}
                          {partner.contact && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{partner.contact}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <button
                  onClick={() => onDonateForDisaster(disaster.id)}
                  className="w-full py-2.5 px-4 rounded-full bg-[#B2D850] hover:bg-[#9CDE64] text-[#1B3322] font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  <span>Bantu Penanganan Bencana Ini</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
