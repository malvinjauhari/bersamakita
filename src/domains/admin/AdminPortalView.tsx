import React from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  ShieldCheck,
  Activity,
  CreditCard,
  Send,
  Building2,
  ScrollText,
  Sliders,
  LogOut,
  ArrowLeft,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../access/AuthContext';
import { BMKGVerificationCard } from '../disaster/BMKGVerificationCard';
import { AdminTransactionsView } from '../finance/AdminTransactionsView';
import { DisbursementManager } from '../finance/DisbursementManager';
import { AdminPartnersView } from '../partner/AdminPartnersView';
import { PublicReportsView } from '../distribution/PublicReportsView';
import { AuditLogsView } from '../operations/AuditLogsView';
import { DuitkuSettingsView } from '../finance/DuitkuSettingsView';
import {
  Disaster,
  Donation,
  Disbursement,
  Partner,
  PartnerAllocation,
  DistributionReport,
  AuditLog,
} from '../../types';

interface AdminPortalViewProps {
  disasters: Disaster[];
  donations: Donation[];
  disbursements: Disbursement[];
  partners: Partner[];
  allocations: PartnerAllocation[];
  reports: DistributionReport[];
  auditLogs: AuditLog[];
  onRefreshBMKG: () => Promise<void>;
  onDataChanged: () => Promise<void>;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  disasters,
  donations,
  disbursements,
  partners,
  allocations,
  reports,
  auditLogs,
  onRefreshBMKG,
  onDataChanged,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { staffSession, isAdminAuthenticated, logoutStaff } = useAuth();

  // ROUTE PROTECTION: Akses /admin WAJIB melalui autentikasi admin di /admin/auth
  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/auth" replace />;
  }

  const handleAdminLogout = () => {
    logoutStaff();
    navigate('/admin/auth');
  };

  const navTabs = [
    { id: 'bmkg-verification', path: '/admin/verification', label: 'Verifikasi BMKG', icon: Activity, count: disasters.filter(d => d.status === 'pending_verification').length },
    { id: 'disbursements', path: '/admin/disbursements', label: 'Pencairan Dana (Disbursement)', icon: Send },
    { id: 'transactions', path: '/admin/donations', label: 'Semua Transaksi Masuk', icon: CreditCard, count: donations.length },
    { id: 'partners', path: '/admin/partners', label: 'Mitra Lapangan', icon: Building2, count: partners.length },
    { id: 'distribution-monitoring', path: '/admin/distribution', label: 'Laporan Penyaluran', icon: FileCheck2, count: reports.length },
    { id: 'audit-logs', path: '/admin/audit', label: 'Audit Log & Transparansi', icon: ScrollText },
    { id: 'settings', path: '/admin/settings', label: 'Pengaturan Gateway Duitku', icon: Sliders },
  ];

  // Determine active tab from URL path
  const currentPath = location.pathname;
  let activeTab = 'bmkg-verification';
  if (currentPath.includes('/donations')) activeTab = 'transactions';
  else if (currentPath.includes('/disbursements')) activeTab = 'disbursements';
  else if (currentPath.includes('/partners')) activeTab = 'partners';
  else if (currentPath.includes('/distribution') || currentPath.includes('/reports')) activeTab = 'distribution-monitoring';
  else if (currentPath.includes('/audit')) activeTab = 'audit-logs';
  else if (currentPath.includes('/settings')) activeTab = 'settings';
  else if (currentPath.includes('/verification')) activeTab = 'bmkg-verification';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-[#B2D850] selection:text-[#1B3322]">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 bg-slate-800/95 backdrop-blur-md border-b border-slate-700/80 px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1B3322] flex items-center justify-center text-[#B2D850] shadow-sm border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white tracking-tight">
                Bersama Kita — Panel Operasional Admin
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ADMIN
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {staffSession?.email || 'bersamakita.my.id@protonmail.com'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all border border-slate-600"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Lihat Tampilan Donatur</span>
          </button>

          <button
            onClick={handleAdminLogout}
            className="p-1.5 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Keluar / Logout Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Admin Workspace with Sidebar & Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 gap-6">
        {/* Admin Navigation Sidebar */}
        <aside className="w-64 shrink-0 hidden md:block space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
            Menu Operasional
          </div>
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#1B3322] text-[#B2D850] shadow-md border border-emerald-500/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#B2D850]' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-emerald-500/30 text-emerald-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Admin Main Content Workspace */}
        <main className="flex-1 min-w-0 bg-white text-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/50 overflow-y-auto">
          {/* Mobile subtabs scroller */}
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-4 mb-6 border-b border-slate-200">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.path)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1B3322] text-[#B2D850]'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab === 'bmkg-verification' && (
            <BMKGVerificationCard
              disasters={disasters}
              partners={partners}
              onRefreshBMKG={onRefreshBMKG}
              onStatusUpdated={onDataChanged}
            />
          )}

          {activeTab === 'disbursements' && (
            <DisbursementManager
              disbursements={disbursements}
              donations={donations}
              disasters={disasters}
              partners={partners}
              onDataChanged={onDataChanged}
            />
          )}

          {activeTab === 'transactions' && (
            <AdminTransactionsView
              donations={donations}
              disasters={disasters}
              partners={partners}
              onDataChanged={onDataChanged}
            />
          )}

          {activeTab === 'partners' && (
            <AdminPartnersView
              partners={partners}
              allocations={allocations}
              onDataChanged={onDataChanged}
            />
          )}

          {activeTab === 'distribution-monitoring' && (
            <PublicReportsView
              reports={reports}
              allocations={allocations}
              onDataChanged={onDataChanged}
              progressMode="admin"
            />
          )}

          {activeTab === 'audit-logs' && (
            <AuditLogsView logs={auditLogs} />
          )}

          {activeTab === 'settings' && (
            <DuitkuSettingsView onDataChanged={onDataChanged} />
          )}
        </main>
      </div>
    </div>
  );
};
