import React from 'react';
import {
  LayoutDashboard,
  Activity,
  HeartHandshake,
  Route,
  FileText,
  ShieldAlert,
  CreditCard,
  Send,
  Building2,
  FileCheck2,
  ScrollText,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenDonate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, onOpenDonate }) => {
  const { role } = useAuth();

  const userNav = [
    { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'disasters', label: 'Info Bencana BMKG', icon: Activity },
    { id: 'donations', label: 'Donasi Saya', icon: HeartHandshake },
    { id: 'tracking', label: 'Pelacakan Bantuan', icon: Route },
    { id: 'reports', label: 'Laporan Penyaluran', icon: FileText },
  ];

  const adminNav = [
    { id: 'admin-overview', label: 'Overview Operasional', icon: LayoutDashboard },
    { id: 'bmkg-verification', label: 'Verifikasi BMKG', icon: ShieldAlert, badge: 'Realtime' },
    { id: 'transactions', label: 'Transaksi Donasi', icon: CreditCard },
    { id: 'disbursements', label: 'Pencairan Dana', icon: Send },
    { id: 'partners', label: 'Mitra & Alokasi', icon: Building2 },
    { id: 'distribution-monitoring', label: 'Laporan Distribusi', icon: FileCheck2 },
    { id: 'audit-logs', label: 'Audit Log', icon: ScrollText },
    { id: 'settings', label: 'Pengaturan Duitku', icon: Sliders },
  ];

  const partnerNav = [
    { id: 'partner-overview', label: 'Dashboard Mitra', icon: LayoutDashboard },
    { id: 'partner-allocations', label: 'Alokasi Dana Diterima', icon: Send },
    { id: 'partner-reports', label: 'Laporan Distribusi', icon: FileCheck2 },
  ];

  const currentNav = role === 'admin' ? adminNav : role === 'partner' ? partnerNav : userNav;

  return (
    <aside className="w-full lg:w-64 bg-white border-r border-slate-100 flex flex-col justify-between shrink-0 p-4">
      <div className="space-y-6">
        {/* Navigation list */}
        <nav className="space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {role === 'admin' ? 'Menu Admin Operasional' : role === 'partner' ? 'Menu Mitra Distribusi' : 'Menu Donatur'}
          </div>

          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#1B3322] text-[#0C8F63] shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#0C8F63]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {(item as any).badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600">
                    {(item as any).badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Promo Card per LawnBuster theme */}
      <div className="mt-6 p-4 rounded-3xl bg-linear-to-br from-[#1B3322] to-[#243E2C] text-white space-y-3">
        <div className="flex items-center gap-2 text-[#0C8F63] text-xs font-bold">
          <Sparkles className="w-4 h-4" />
          <span>Transparansi Nyata</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Semua dana tersalurkan langsung dipantau secara transparan hingga ke tangan korban bencana.
        </p>
        {onOpenDonate && role !== 'admin' && (
          <button
            onClick={onOpenDonate}
            className="w-full py-2 px-3 rounded-full bg-[#0C8F63] hover:bg-[#9CDE64] text-[#1B3322] font-bold text-xs transition-colors shadow-sm"
          >
            Donasi Sekarang
          </button>
        )}
      </div>
    </aside>
  );
};
