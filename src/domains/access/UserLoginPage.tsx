import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, ShieldCheck, ArrowLeft, Loader2, User, Users, CheckCircle2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useToast } from '../../components/feedback/Toast';

export const UserLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const { user, loginGoogle, loginAsUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // If already logged in, redirect to dashboard or redirectPath
  React.useEffect(() => {
    if (user) {
      navigate(redirectPath);
    }
  }, [user, navigate, redirectPath]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginGoogle();
      showToast('Berhasil masuk sebagai Donatur dengan Google', 'success');
      navigate(redirectPath);
    } catch (err: any) {
      showToast('Gagal masuk: ' + (err.message || 'Silakan coba lagi'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestUserLogin = async (
    uid: string,
    email: string,
    displayName: string
  ) => {
    setLoading(true);
    try {
      await loginAsUser({ uid, email, displayName });
      showToast(`Berhasil masuk sebagai ${displayName} (${email})`, 'success');
      navigate(redirectPath);
    } catch (err: any) {
      showToast('Gagal masuk: ' + (err.message || 'Silakan coba lagi'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customName.trim()) {
      showToast('Mohon isi nama dan email donatur', 'warning');
      return;
    }
    const cleanEmail = customEmail.trim().toLowerCase();
    const cleanUid = 'usr-' + cleanEmail.replace(/[^a-z0-9]/g, '-');
    await handleTestUserLogin(cleanUid, cleanEmail, customName.trim());
  };

  return (
    <div className="min-h-screen bg-[#F7F9F8] flex flex-col justify-between selection:bg-[#B2D850] selection:text-[#1B3322]">
      {/* Top back bar */}
      <header className="p-4 sm:p-6 max-w-7xl mx-auto w-full flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-full hover:bg-slate-200/60 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#1B3322] flex items-center justify-center text-[#B2D850] shadow-xs">
            <Heart className="w-3.5 h-3.5 fill-current" />
          </div>
          <span className="font-extrabold text-sm text-[#1B3322]">Bersama Kita</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl max-w-md w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-[#1B3322] text-[#B2D850] mx-auto flex items-center justify-center shadow-md">
              <Heart className="w-7 h-7 fill-current" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Masuk sebagai Donatur
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Login untuk berdonasi darurat, memantau alokasi dana secara transparan, dan melacak penyaluran riil ke posko bencana secara eksklusif untuk akun Anda.
            </p>
          </div>

          {/* Google Sign In CTA */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-full bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-300 shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{loading ? 'Menghubungkan Akun...' : 'Lanjutkan dengan Akun Google'}</span>
            </button>
          </div>

          {/* Quick Multi-User Test Accounts (Verifikasi Pemisahan Data User A vs User B) */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
              <span className="flex items-center gap-1 text-slate-700 font-bold">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Uji Coba Cepat Pemisahan Akun (Multi-User):</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  handleTestUserLogin(
                    'user-budi-pratama',
                    'budi.pratama@gmail.com',
                    'Budi Pratama (Donatur A)'
                  )
                }
                className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-left transition-all cursor-pointer group"
              >
                <div className="font-bold text-emerald-950 flex items-center justify-between">
                  <span>Donatur A</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 opacity-60 group-hover:opacity-100" />
                </div>
                <div className="text-[11px] text-emerald-800 font-medium">Budi Pratama</div>
                <div className="text-[10px] text-emerald-600/80 font-mono truncate">budi@gmail.com</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleTestUserLogin(
                    'user-siti-rahma',
                    'siti.rahma@gmail.com',
                    'Siti Rahma (Donatur B)'
                  )
                }
                className="p-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70 text-left transition-all cursor-pointer group"
              >
                <div className="font-bold text-indigo-950 flex items-center justify-between">
                  <span>Donatur B</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 opacity-60 group-hover:opacity-100" />
                </div>
                <div className="text-[11px] text-indigo-800 font-medium">Siti Rahma</div>
                <div className="text-[10px] text-indigo-600/80 font-mono truncate">siti@gmail.com</div>
              </button>
            </div>

            {/* Custom Donor Input Accordion */}
            <div className="pt-1">
              {!showCustomForm ? (
                <button
                  type="button"
                  onClick={() => setShowCustomForm(true)}
                  className="w-full text-center text-[11px] text-slate-500 hover:text-slate-800 font-medium py-1"
                >
                  + Atau Masuk dengan Nama/Email Donatur Kustom
                </button>
              ) : (
                <form onSubmit={handleCustomLogin} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                  <div className="font-bold text-slate-700 text-[11px]">Masuk dengan Akun Donatur Kustom:</div>
                  <input
                    type="text"
                    placeholder="Nama Lengkap Donatur"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email Donatur (contoh: user@gmail.com)"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                    required
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(false)}
                      className="px-3 py-1.5 text-slate-500 text-[11px]"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-1.5 rounded-xl bg-[#1B3322] text-[#B2D850] font-bold text-[11px] cursor-pointer"
                    >
                      Masuk Akun Ini
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Transparansi Guarantee */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Transparansi Dana & Keamanan Donatur</span>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Setiap donasi memiliki kode alokasi operasional terverifikasi, dilacak secara berurutan ke bawah, dan hanya dapat dilihat oleh pemilik akun donatur.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-400">
        © 2026 Bersama Kita. Tanggap Bencana & Donasi Transparan.
      </footer>
    </div>
  );
};
