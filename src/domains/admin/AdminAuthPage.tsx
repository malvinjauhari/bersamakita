import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../access/AuthContext';
import { useToast } from '../../components/feedback/Toast';

export const AdminAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdminAuthenticated, loginStaff } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState<string>('bersamakita.my.id@protonmail.com');
  const [password, setPassword] = useState<string>('bersamakita01');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // If already logged in as admin in staff session, redirect to /admin
  React.useEffect(() => {
    if (isAdminAuthenticated) {
      navigate('/admin');
    }
  }, [isAdminAuthenticated, navigate]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await loginStaff(email, password);
      if (res.role === 'admin') {
        showToast('Autentikasi admin berhasil! Selamat datang di Panel Operasional.', 'success');
        navigate('/admin');
      } else {
        showToast('Akun mitra lapangan terdeteksi. Mengalihkan ke Portal Mitra...', 'info');
        navigate('/partner');
      }
    } catch (err: any) {
      showToast(err.message || 'Email atau kata sandi admin salah. Akses ditolak.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillCredentials = () => {
    setEmail('bersamakita.my.id@protonmail.com');
    setPassword('bersamakita01');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-[#B2D850] selection:text-[#1B3322]">
      {/* Top minimal back bar */}
      <header className="p-4 sm:p-6 max-w-7xl mx-auto w-full flex items-center justify-between border-b border-slate-800">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda Donatur</span>
        </button>
        <span className="text-[11px] font-mono text-slate-500">Route: /admin/auth</span>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-[#1B3322] text-[#B2D850] mx-auto flex items-center justify-center shadow-lg border border-emerald-500/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Otentikasi Administrator
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Portal internal staf operasional Bersama Kita untuk verifikasi seismik BMKG, pencairan dana mitra, dan monitoring logistik.
            </p>
          </div>

          {/* Quick Credential Box */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300">Kredensial Admin Resmi:</span>
              <button
                type="button"
                onClick={handleFillCredentials}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors"
              >
                Isi Otomatis
              </button>
            </div>
            <div className="font-mono text-[11px] text-slate-400 space-y-0.5">
              <p>Email: <span className="text-slate-200">bersamakita.my.id@protonmail.com</span></p>
              <p>Sandi: <span className="text-slate-200">bersamakita01</span></p>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Email Administrator</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bersamakita.my.id@protonmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#B2D850] text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Kata Sandi</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#B2D850] text-xs font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-full bg-[#B2D850] hover:bg-[#9CDE64] text-[#1B3322] font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 mt-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin text-[#1B3322]" />}
              <span>Masuk ke Panel Operasional Admin</span>
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-slate-500 text-xs border-t border-slate-800">
        © 2026 Bersama Kita. Sistem Operasional Terproteksi.
      </footer>
    </div>
  );
};
