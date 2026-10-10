import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Loader2, ShieldCheck, Activity } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useToast } from '../../components/feedback/Toast';

const CAROUSEL_IMAGES = [
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1532629345422-7515f3d16bb7?auto=format&fit=crop&w=1920&q=80',
];

export const UserLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const { user, loginGoogle } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-scroll images
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans selection:bg-[#0C8F63] selection:text-white bg-white">
      
      {/* Left Panel: Branding & Illustration with Carousel */}
      <div className="w-full md:w-1/2 relative p-8 md:p-16 flex flex-col justify-between min-h-[30vh] md:min-h-screen overflow-hidden">
        
        {/* Background Image Carousel */}
        {CAROUSEL_IMAGES.map((img, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out transform scale-105 ${
              idx === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Header / Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-3 relative z-10 text-left group">
          <div className="w-10 h-10 rounded-xl bg-[#0C8F63] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-white tracking-wide text-sm">BERSAMA KITA</span>
            <span className="font-extrabold text-emerald-300 text-lg tracking-wider">CHARITY</span>
          </div>
        </button>

        {/* Main Illustration Area */}
        <main className="relative z-10 flex-1 flex flex-col justify-center py-12 max-w-sm">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
            Satu langkah kecil, <br/> perubahan besar.
          </h2>
          <p className="text-white/90 font-medium text-sm">
            Bergabunglah dengan ribuan donatur lainnya untuk membantu mereka yang terdampak bencana.
          </p>
        </main>

        <footer className="relative z-10 text-[11px] text-white/70 font-medium hidden md:block">
          <p>© 2026 Bersama Kita Charity. Powered by NOC</p>
        </footer>
      </div>

      {/* Right Panel: Login Interaction (Solid White) */}
      <div className="w-full md:w-1/2 bg-white flex flex-col justify-between p-8 md:p-16 min-h-[70vh] md:min-h-screen">
        
        {/* Spacer for vertical centering in flex-col */}
        <div className="hidden md:block"></div>

        <div className="w-full max-w-[400px] mx-auto flex flex-col justify-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
            Login Donatur
          </h1>
          <p className="text-sm text-gray-500 mb-8 font-medium">Selamat datang kembali! Lanjutkan niat baik Anda hari ini.</p>
          
          {/* Feature highlights to fill space and build trust */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-8 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#0C8F63]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800">Transparan & Aman</h4>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Seluruh donasi Anda tercatat di sistem secara transparan tanpa potongan tersembunyi.</p>
              </div>
            </div>
            <div className="h-px w-full bg-gray-200" />
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800">Laporan Real-Time</h4>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Pantau langsung pergerakan bantuan Anda dari awal hingga tiba di lokasi bencana.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 text-left">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-bold text-sm transition-colors flex items-center justify-center gap-3 border border-gray-300 shadow-sm disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              <span>{loading ? 'Masuk...' : 'Sign in with Google'}</span>
            </button>
            
            <p className="text-xs text-gray-500 leading-relaxed font-medium text-center">
              Akses cepat dengan akun Google terdaftar Anda.
            </p>
          </div>
        </div>

        {/* Global Footer (Right Side Bottom) */}
        <footer className="mt-16 md:mt-auto flex flex-col md:flex-row items-center md:items-end justify-between text-[11px] text-gray-400 font-medium">
          <button onClick={() => navigate('/terms')} className="hover:text-gray-600 transition-colors mb-2 md:mb-0">
            Terms and Services
          </button>
          <div className="text-center md:text-right">
            Have a problem? Contact us at<br/>
            <a href="mailto:info@bersamakita.org" className="underline hover:text-gray-600 transition-colors">info@bersamakita.org</a>
          </div>
        </footer>
      </div>

    </div>
  );
};
