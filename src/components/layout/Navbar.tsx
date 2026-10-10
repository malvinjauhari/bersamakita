import React from 'react';
import { Heart, LogOut, Shield, User, Building2 } from 'lucide-react';
import { useAuth } from '../../domains/access/AuthContext';
import { UserRole } from '../../types';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenDonate: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDonate }) => {
  const { user, profile, role, logout } = useAuth();

  const roleLabels: Record<UserRole, { label: string; bg: string; text: string; icon: any }> = {
    user: { label: 'Donatur (Google)', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: User },
    admin: { label: 'Admin Operasional', bg: 'bg-amber-50', text: 'text-amber-800', icon: Shield },
    partner: { label: 'Mitra Lapangan', bg: 'bg-indigo-50', text: 'text-indigo-700', icon: Building2 },
  };

  const RoleIcon = roleLabels[role]?.icon || User;

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#1B3322] flex items-center justify-center text-[#0C8F63] shadow-sm">
          <Heart className="w-5 h-5 fill-current" />
        </div>
        <div>
          <span className="font-extrabold text-base tracking-tight text-[#1B3322]">
            Bersama Kita
          </span>
          <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#0C8F63]/20 text-[#1B3322]">
            Tanggap Bencana
          </span>
        </div>
      </div>

      {/* Actions & User Profile */}
      <div className="flex items-center gap-3">
        {/* Quick CTA Donasi for non-admin */}
        {role !== 'admin' && (
          <button
            onClick={onOpenDonate}
            className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-full bg-[#0C8F63] hover:bg-[#9CDE64] text-[#1B3322] text-xs font-bold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>Mulai Donasi</span>
          </button>
        )}

        {/* Role Badge - Strictly displays authenticated role */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 ${roleLabels[role]?.bg} ${roleLabels[role]?.text}`}
        >
          <RoleIcon className="w-3.5 h-3.5" />
          <span>{roleLabels[role]?.label}</span>
        </div>

        {/* User Profile & Sign Out */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-[#1B3322] text-[#0C8F63] font-bold text-xs flex items-center justify-center shrink-0">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              (profile?.displayName || user?.email || 'U')[0].toUpperCase()
            )}
          </div>
          <div className="hidden md:block text-left mr-1">
            <p className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
              {profile?.displayName || user?.email?.split('@')[0]}
            </p>
            <p className="text-[10px] text-slate-400 truncate max-w-[140px] font-mono">{user?.email}</p>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Keluar / Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
