import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { DistributionReport } from '../../types';
import { formatRupiah } from '../../lib/utils';
import { WideNavbar } from '../../components/layout/WideNavbar';
import { WideFooter } from '../../components/layout/WideFooter';

interface ReportsPageProps {
  reports: DistributionReport[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ reports }) => {
  const navigate = useNavigate();

  const publicReports = reports.filter(
    (r) => r.status === 'submitted' || r.status === 'published'
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 selection:bg-[#0C8F63] selection:text-[#1B3322]">
      <WideNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-10 space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-200/60 pb-8">
          <div className="space-y-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Dashboard</span>
            </button>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold shadow-xs">
              <Package className="w-3.5 h-3.5 text-emerald-600" />
              <span>Transparansi Penyaluran</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Laporan & Alokasi Bantuan Fisik
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
              Seluruh bukti fisik penyerahan bantuan, logistik terdistribusi, dan dokumentasi foto posko yang diverifikasi oleh mitra lapangan (PMI, BAZNAS, Tagana).
            </p>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-2xl bg-[#1B3322] hover:bg-[#243E2C] text-[#0C8F63] text-sm font-bold shadow-lg shadow-[#1B3322]/20 transition-all self-start sm:self-auto hover:-translate-y-0.5 active:translate-y-0"
          >
            Berdonasi ke Posko
          </button>
        </div>

        {/* Content */}
        {publicReports.length === 0 ? (
          <div className="bg-white rounded-4xl p-16 text-center border border-slate-200/60 shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-400 mx-auto flex items-center justify-center border border-slate-100 shadow-inner">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">
              Dokumentasi Sedang Dihimpun
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Mitra di lapangan saat ini sedang dalam proses distribusi fisik dan pendataan penerima manfaat. Laporan akan tampil segera setelah disetujui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {publicReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-4xl p-8 border border-slate-200/60 shadow-sm space-y-5 hover:shadow-xl hover:border-emerald-200 transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-5">
                  <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5 font-bold text-slate-900">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100 text-emerald-600">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="text-sm">{report.partnerName}</span>
                    </div>
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1.5 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Terverifikasi Lapangan</span>
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed italic bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                    "{report.notes}"
                  </p>

                  {report.items && report.items.length > 0 && (
                    <div className="space-y-2.5 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        Barang Kebutuhan Disalurkan
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {report.items.map((it, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs hover:bg-slate-100 transition-colors"
                          >
                            <span>{it.name}</span>
                            <span className="text-slate-400 font-normal">|</span>
                            <span className="text-emerald-700">{it.quantity} {it.unit}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.photoUrls && report.photoUrls.length > 0 && (
                    <div className="space-y-2.5 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Dokumentasi Penyerahan
                      </span>
                      <div className="grid grid-cols-3 gap-3">
                        {report.photoUrls.map((photo: string, pIdx: number) => (
                          <div
                            key={pIdx}
                            className="h-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group-hover:shadow-md transition-all duration-300"
                          >
                            <img
                              src={photo}
                              alt="Dokumentasi Penyerahan"
                              className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-4 h-4 text-slate-300" />
                    <span>{new Date(report.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400/80 uppercase tracking-wider">ID: {report.id.substring(0, 8)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <WideFooter />
    </div>
  );
};
