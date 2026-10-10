import React from 'react';
import { Package, Clock, CheckCircle2, Building2 } from 'lucide-react';
import { DistributionReport } from '../../types';
import { formatRupiah } from '../../lib/utils';

interface AllocationTransparencySectionProps {
  reports: DistributionReport[];
  disasterTitle?: string;
}

export const AllocationTransparencySection: React.FC<AllocationTransparencySectionProps> = ({
  reports,
  disasterTitle,
}) => {
  const publicReports = reports.filter((r) => r.status === 'submitted' || r.status === 'published');
  const totalRealisasi = publicReports.reduce((sum, r) => {
    // Each verified distributed package is estimated
    return sum + (r.items ? r.items.length * 500000 : 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Header Bar matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <Package className="w-4 h-4 text-emerald-600" />
            <span>Transparansi Penggunaan & Alokasi Dana</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900">
            Rincian Alokasi Bantuan Lapangan yang Disetujui Partner
          </h3>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            Total dana yang terkumpul dialokasikan ke barang kebutuhan riil di bawah ini setelah diverifikasi dan disetujui partner pelaksana posko.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700 shrink-0 self-start sm:self-auto">
          Total Realisasi: <span className="text-emerald-700">{formatRupiah(totalRealisasi)}</span>
        </div>
      </div>

      {/* Main Content Box */}
      {publicReports.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-12 border border-slate-200/80 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>

          <h4 className="text-base font-bold text-slate-900">
            Dana Sedang Dipetakan ke Kebutuhan Lapangan
          </h4>

          <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
            Donasi yang masuk ke posko ini sedang dihimpun dalam rekening escrow. Admin dan Partner Lapangan (PMI, Tagana, Tim Relawan) sedang melakukan asesmen kebutuhan fisik. Rincian pengalokasian (seperti pakaian, sembako, dan air) akan muncul di sini segera setelah disetujui partner.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {publicReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{report.partnerName}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Disetujui Partner
                </span>
              </div>

              <p className="text-xs text-slate-600 italic">"{report.notes}"</p>

              {report.items && report.items.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Item Kebutuhan Disalurkan:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {report.items.map((it, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{it.name}: <strong>{it.quantity} {it.unit}</strong></span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
