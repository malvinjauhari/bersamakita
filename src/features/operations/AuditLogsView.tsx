import React from 'react';
import { ScrollText, Shield, Clock } from 'lucide-react';
import { AuditLog } from '../../types';
import { formatDateIndo } from '../../lib/utils';

interface AuditLogsViewProps {
  logs: AuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs }) => {
  return (
    <div className="space-y-6 w-full">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4 w-full">
        <div className="w-full">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B3322] uppercase tracking-wider mb-1">
            <ScrollText className="w-4 h-4 text-emerald-600" />
            <span>Audit & Kepatuhan Sistem</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 w-full">Catatan Audit Log Operasional</h2>
          <p className="text-xs text-slate-500 mt-0.5 w-full">
            Semua aktivitas sensitif (verifikasi BMKG, transaksi donasi, pencairan dana, perubahan laporan mitra) tercatat secara permanen.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Belum ada catatan audit log tersimpan.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Waktu</th>
                  <th className="py-3 px-6">Aktor & Peran</th>
                  <th className="py-3 px-6">Aksi (Action)</th>
                  <th className="py-3 px-6">Entitas Terkait</th>
                  <th className="py-3 px-6">Perubahan State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 text-slate-500 whitespace-nowrap text-[11px] min-w-[120px]">
                      {formatDateIndo(log.timestamp)}
                    </td>
                    <td className="py-3.5 px-6 font-sans min-w-[160px]">
                      <div className="font-semibold text-slate-800 text-xs break-all">
                        {log.actorEmail || log.actorId}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        [{log.actorRole}]
                      </span>
                    </td>
                    <td className="py-3.5 px-6 min-w-[160px]">
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-600 text-[11px] min-w-[200px] break-all">
                      {log.entityType}: {log.entityId}
                    </td>
                    <td className="py-3.5 px-6 text-[10px] text-slate-500 min-w-[250px] max-w-sm wrap-break-word font-sans">
                      {log.after ? JSON.stringify(log.after) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
