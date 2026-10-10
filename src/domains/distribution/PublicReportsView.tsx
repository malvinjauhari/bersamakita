import React from 'react';
import { FileCheck2, MapPin, Calendar, Building2, Package, Image as ImageIcon, ListTodo } from 'lucide-react';
import { DistributionReport, PartnerAllocation } from '../../types';
import { formatDateIndo } from '../../lib/utils';
import { DistributionProgressCard } from './DistributionProgressCard';

interface PublicReportsViewProps {
  reports: DistributionReport[];
  allocations?: PartnerAllocation[];
  onDataChanged?: () => void;
  /**
   * 'donor' (default): read-only — quick-action bar "Aksi Cepat Tahap
   * Selanjutnya" is fully hidden for the public/user-facing side.
   * 'admin': keeps the milestone quick actions (admin portal only).
   */
  progressMode?: 'donor' | 'admin';
}

export const PublicReportsView: React.FC<PublicReportsViewProps> = ({
  reports,
  allocations = [],
  onDataChanged,
  progressMode = 'donor',
}) => {
  // Only submitted / published reports per section 22
  const publicReports = reports.filter((r) => r.status === 'submitted' || r.status === 'published');

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B3322] uppercase tracking-wider mb-1">
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            <span>Transparansi Penyaluran Publik & Mitra</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Laporan Aktual & Progres Lapangan</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Laporan riil pelaksanaan bantuan di lapangan yang dilaporkan oleh mitra resmi secara bertahap dan transparan.
          </p>
        </div>
      </div>

      {/* Live Operational Allocation Milestones */}
      {allocations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <ListTodo className="w-4 h-4 text-emerald-600" />
              <span>Monitoring Tahapan Aktual Mitra Lapangan</span>
            </div>
            <span className="text-xs font-mono text-slate-600">
              {allocations.length} Tugas Alokasi Terpantau
            </span>
          </div>

          <div className="space-y-5">
            {allocations.map((alloc) => (
              <DistributionProgressCard
                key={alloc.id}
                allocation={alloc}
                mode={progressMode}
                onUpdated={onDataChanged}
              />
            ))}
          </div>
        </div>
      )}

      {/* Submitted Documentation Reports */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-indigo-600" />
          <span>Berita Acara & Dokumentasi Serah Terima ({publicReports.length})</span>
        </h3>

      {publicReports.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3">
          <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Belum Ada Laporan Penyaluran</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            Laporan penyaluran beserta rincian item bantuan dan dokumentasi akan diunggah oleh mitra setelah proses distribusi lapangan selesai.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {publicReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              {/* Photo preview if available */}
              {report.photoUrls && report.photoUrls[0] && (
                <div className="h-44 w-full bg-slate-100 relative overflow-hidden">
                  <img
                    src={report.photoUrls[0]}
                    alt="Dokumentasi Penyaluran"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold">
                    Bukti Penyerahan
                  </div>
                </div>
              )}

              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <span>{report.partnerName}</span>
                    </div>
                    <span className="text-slate-600 font-mono text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{report.distributionDate}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{report.location}</span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    "{report.notes}"
                  </p>

                  {/* Items list */}
                  {report.items && report.items.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Item Bantuan Tersalurkan:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {report.items.map((it, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-100"
                          >
                            <Package className="w-3 h-3 text-emerald-600" />
                            <span>
                              {it.name}: {it.quantity} {it.unit}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 font-mono flex justify-between items-center">
                  <span>Diverifikasi pada {formatDateIndo(report.submittedAt)}</span>
                  <span className="font-bold text-emerald-700">✓ Sah & Terbuka</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};
