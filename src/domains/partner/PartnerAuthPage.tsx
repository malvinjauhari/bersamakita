import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../access/AuthContext';
import { useToast } from '../../components/feedback/Toast';

export const PartnerAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { isPartnerAuthenticated, loginStaff } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // If already logged in as partner in staff session, redirect to /partner
  React.useEffect(() => {
    if (isPartnerAuthenticated) {
      navigate('/partner');
    }
  }, [isPartnerAuthenticated, navigate]);

  const handlePartnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await loginStaff(email, password);
      if (res.role === 'partner') {
        showToast('Autentikasi mitra lapangan berhasil!', 'success');
        navigate('/partner');
      } else {
        showToast('Akun admin terdeteksi. Mengalihkan ke Panel Admin...', 'info');
        navigate('/admin');
      }
    } catch (err: any) {
      showToast(err.message || 'Email atau kata sandi mitra salah. Akses ditolak.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillCredentials = () => {
    // No longer auto-filling generic mock credentials. 
    // Partner must use an account created via Admin Dashboard.
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
        <span className="text-[11px] font-mono text-slate-500">Route: /partner/auth</span>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-indigo-900 text-indigo-300 mx-auto flex items-center justify-center shadow-lg border border-indigo-500/30">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Portal Mitra Lapangan
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Akses khusus organisasi mitra (PMI, BAZNAS, Tagana, Relawan) untuk konfirmasi penerimaan dana dan pengiriman laporan fisik distribusi posko.
            </p>
          </div>

          {/* Authentication Note */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700 text-xs space-y-2">
            <div className="font-mono text-[11px] text-slate-400 space-y-0.5">
              <p>Gunakan kredensial akun yang telah didaftarkan oleh Admin Operasional.</p>
            </div>
          </div>

          <form onSubmit={handlePartnerLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Email Mitra Lapangan</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partnerbersamakita@protonmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-xs font-mono"
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
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-xs font-mono"
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
              className="w-full py-3.5 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 mt-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>Masuk ke Dashboard Mitra</span>
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-slate-500 text-xs border-t border-slate-800">
        © 2026 Bersama Kita. Sistem Pelaporan Mitra Terintegrasi.
      </footer>
    </div>
  );
};
