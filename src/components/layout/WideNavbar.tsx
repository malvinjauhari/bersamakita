import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Heart,
  LayoutGrid,
  Radio,
  Package,
  Activity,
  LogOut,
  LogIn,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../../domains/access/AuthContext';

export const WideNavbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, logout } = useAuth();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard Bencana', icon: LayoutGrid },
    { path: '/dashboard/analysis', label: 'Analisis Situasi', icon: Activity },
    { path: '/dashboard/reports', label: 'Transparansi Penyaluran', icon: Package },
    { path: '/dashboard/katalog', label: 'Katalog BMKG', icon: Radio },
    { path: '/my-donation', label: 'Donasi Saya', icon: Heart },
    { path: '/cek-transaksi', label: 'Cek Transaksi', icon: Receipt },
  ];

  const displayName =
    profile?.displayName ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Donatur';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand "Bersama Kita" */}
        <div
          onClick={() => navigate(user ? '/dashboard' : '/')}
          className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
        >
          <div className="w-8 h-8 rounded-full bg-[#1B3322] flex items-center justify-center text-[#0C8F63] shadow-sm">
            <Heart className="w-4 h-4 fill-current" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-[#1B3322] block leading-none">
              Bersama Kita
            </span>
            <span className="text-[9px] font-semibold text-slate-400 tracking-wider uppercase block mt-0.5">
              Tanggap Bencana
            </span>
          </div>
        </div>

        {/* Center: Main Path-Based Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-50/80 p-1 rounded-full border border-slate-200/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/dashboard' &&
                location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-emerald-800 shadow-sm border border-slate-100 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* User Profile or Login CTA */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  displayName[0].toUpperCase()
                )}
              </div>
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-800 max-w-[120px] truncate">
                {displayName}
              </span>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors ml-0.5"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/auth/login')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#0C8F63] text-xs font-bold transition-all shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Donatur</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
