import React, { useState } from 'react';
import { FileBarChart2 } from 'lucide-react';
import { Disaster } from '../../types';
import { FinalReportSection } from './FinalReportSection';

interface AdminFinalReportPanelProps {
  disasters: Disaster[];
  onClosed?: () => void;
}

/**
 * Panel laporan AKHIR + aksi "Tutup Penggalangan" untuk admin.
 * Semua angka di-derive server-side dari transaksi nyata (bukan input manual).
 */
export const AdminFinalReportPanel: React.FC<AdminFinalReportPanelProps> = ({
  disasters,
  onClosed,
}) => {
  const [disasterId, setDisasterId] = useState<string>(disasters[0]?.id || '');
  const selected = disasters.find((d) => d.id === disasterId) || disasters[0];

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
          <FileBarChart2 className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-slate-900">
            Laporan Akhir & Penutupan Penggalangan
          </h3>
          <p className="text-[11px] text-slate-500">
            Laporan dihitung otomatis dari transaksi tercatat (donasi paid, biaya
            admin 0,17%, pencairan, alokasi, timeline). Pilih bencana:
          </p>
        </div>
        <select
          value={selected?.id || ''}
          onChange={(e) => setDisasterId(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[260px]"
        >
          {disasters.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title.slice(0, 60)}
            </option>
          ))}
        </select>
      </div>

      {selected ? (
        <FinalReportSection disasterId={selected.id} canClose onClosed={onClosed} />
      ) : (
        <p className="text-xs text-slate-400">Belum ada bencana terdaftar.</p>
      )}
    </div>
  );
};