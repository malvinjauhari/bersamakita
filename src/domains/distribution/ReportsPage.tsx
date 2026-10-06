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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 selection:bg-[#B2D850] selection:text-[#1B3322]">
      <WideNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="space-y-1.5">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Dashboard Bencana</span>
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <Package className="w-3.5 h-3.5 text-emerald-600" />
              <span>Transparansi Penyaluran Posko</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Laporan Penyaluran & Alokasi Bantuan Fisik
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Seluruh bukti fisik penyerahan bantuan, logistik terdistribusi, dan dokumentasi foto posko yang diverifikasi oleh mitra lapangan (PMI, BAZNAS, Tagana).
            </p>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] text-xs font-bold shadow-sm transition-all self-start sm:self-auto hover:scale-[1.02]"
          >
            Berdonasi ke Posko
          </button>
        </div>

        {/* Content */}
        {publicReports.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              Dokumentasi Sedang Dihimpun oleh Mitra
            </h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
              Mitra di lapangan saat ini sedang dalam proses distribusi fisik dan pendataan penerima manfaat. Laporan resmi beserta foto dokumentasi akan tampil di sini segera setelah disetujui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {publicReports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>{report.partnerName}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Terverifikasi Lapangan</span>
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "{report.notes}"
                </p>

                {report.items && report.items.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Barang Kebutuhan Disalurkan:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {report.items.map((it, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200"
                        >
                          <Package className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{it.name}: {it.quantity} {it.unit}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {report.photoUrls && report.photoUrls.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Dokumentasi Penyerahan:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {report.photoUrls.map((photo: string, pIdx: number) => (
                        <div
                          key={pIdx}
                          className="h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100"
                        >
                          <img
                            src={photo}
                            alt="Dokumentasi Penyerahan"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(report.createdAt).toLocaleDateString('id-ID')}</span>
                  </span>
                  <span className="font-mono text-slate-500">ID: {report.id}</span>
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
