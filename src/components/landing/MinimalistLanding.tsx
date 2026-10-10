import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  ArrowRight,
  ShieldCheck,
  Loader2,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../../domains/access/AuthContext';
import { useToast } from '../feedback/Toast';

const CAROUSEL_IMAGES = [
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1532629345422-7515f3d16bb7?auto=format&fit=crop&w=1920&q=80',
];

export const MinimalistLanding: React.FC = () => {
  const navigate = useNavigate();
  const { user, loginGoogle } = useAuth();
  const { showToast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Auto-scroll images
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setSubmitting(true);
      await loginGoogle();
      showToast('Berhasil masuk sebagai Donatur dengan Google', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      showToast('Gagal masuk dengan Google: ' + (err.message || 'Periksa koneksi'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMainCTA = () => {
    if (!user) {
      navigate('/auth/login?redirect=/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans selection:bg-[#0C8F63] selection:text-white">
      {/* Left Panel: Content (50%) */}
      <div className="w-full md:w-1/2 flex flex-col p-8 md:p-16 lg:p-24 relative z-10 bg-white shadow-[1px_0_10px_rgba(0,0,0,0.05)]">
        {/* Header */}
        <header className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0C8F63] flex items-center justify-center text-white">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-slate-800 tracking-tight">Bersama Kita</span>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Charity Platform</span>
            </div>
          </div>
          
          {/* Mobile login handled in buttons below, but kept top-right for desktop */}
          <div className="hidden sm:block">
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate('/auth/login')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Donatur</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Hero Content */}
        <main className="flex-1 flex flex-col justify-center max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-[#0C8F63] font-semibold mb-8 w-fit">
            <ShieldCheck className="w-4 h-4" />
            <span>Terintegrasi BMKG & Laporan Transparan</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
            Satu kepedulian,<br />untuk mereka yang membutuhkan.
          </h2>

          <p className="text-base text-slate-600 font-medium leading-relaxed mb-10 max-w-md">
            Setiap donasi tunai tercatat secara real-time, dialokasikan langsung kepada mitra terpercaya di lapangan, dan dipantau hingga penyaluran tuntas.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button
              onClick={handleMainCTA}
              className="flex-1 px-6 py-4 rounded-xl bg-[#0C8F63] hover:bg-emerald-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>Mulai Donasi Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="flex-1 px-6 py-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>Masuk Donatur</span>
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-16 text-[11px] text-slate-500 font-medium flex flex-wrap gap-x-6 gap-y-3">
          <p>© 2026 Bersama Kita</p>
          <span onClick={() => navigate('/faq')} className="hover:text-slate-800 transition-colors cursor-pointer">FAQ</span>
          <span onClick={() => navigate('/terms')} className="hover:text-slate-800 transition-colors cursor-pointer">Syarat & Ketentuan</span>
          <span onClick={() => navigate('/contact')} className="hover:text-slate-800 transition-colors cursor-pointer">Hubungi Kami</span>
        </footer>
      </div>

      {/* Right Panel: Full Image Carousel (50%) */}
      <div className="w-full md:w-1/2 relative bg-slate-900 min-h-[400px] md:min-h-screen">
        {CAROUSEL_IMAGES.map((img, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
              idx === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
        {/* Simple Gradient for Indicator Visibility */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-10">
          {CAROUSEL_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
