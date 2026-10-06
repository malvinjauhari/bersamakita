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
    <div className="relative min-h-screen flex flex-col justify-between bg-[#1B3322] text-white overflow-hidden selection:bg-[#B2D850] selection:text-[#1B3322]">
      {/* Background Image Carousel with Smooth Transitions */}
      <div className="absolute inset-0 z-0">
        {CAROUSEL_IMAGES.map((img, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out transform scale-105 ${
              idx === currentIndex ? 'opacity-40' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-[#14281A]/90 via-[#1B3322]/80 to-[#14281A]/95" />
      </div>

      {/* Minimal Top Brand Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#B2D850] flex items-center justify-center text-[#1B3322] shadow-md shadow-[#B2D850]/20">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              Bersama Kita
            </h1>
            <p className="text-[11px] text-[#B2D850] font-medium tracking-wide">
              Platform Tanggap Bencana & Donasi Tunai
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 rounded-full bg-[#B2D850] hover:bg-[#9CDE64] text-[#1B3322] text-xs font-bold transition-all shadow-lg shadow-[#B2D850]/20 hover:scale-105 active:scale-95"
            >
              Buka Dashboard
            </button>
          ) : (
            <button
              onClick={() => navigate('/auth/login')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#B2D850] hover:bg-[#9CDE64] text-[#1B3322] text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Donatur</span>
            </button>
          )}
        </div>
      </header>

      {/* Main/Hero Section - Strictly Minimalist per DESIGN.md */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto py-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-[#B2D850] mb-6 font-medium animate-in fade-in zoom-in duration-700">
          <ShieldCheck className="w-4 h-4 text-[#B2D850]" />
          <span>Terintegrasi BMKG & Tracking Penyaluran Transparan</span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-6">
          Satu kepedulian, untuk mereka yang membutuhkan.
        </h2>

        <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed mb-10">
          Setiap donasi tunai tercatat secara real-time, dialokasikan langsung kepada mitra terpercaya di lapangan, dan dipantau hingga penyaluran tuntas.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          {/* CTA: Mulai Donasi */}
          <button
            onClick={handleMainCTA}
            className="w-full sm:w-auto flex-1 px-8 py-4 rounded-full bg-[#B2D850] hover:bg-[#9CDE64] text-[#1B3322] font-bold text-base transition-all duration-200 shadow-xl shadow-[#B2D850]/25 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Mulai Donasi</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Login Donatur with Google (Strictly for User/Donor) */}
          <button
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="w-full sm:w-auto flex-1 px-6 py-4 rounded-full bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm transition-all duration-200 shadow-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
            <span>Login Donatur (Google)</span>
          </button>
        </div>

        {/* Carousel indicators */}
        <div className="flex items-center gap-2 mt-8">
          {CAROUSEL_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'w-8 bg-[#B2D850]' : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </main>

      {/* Strictly Minimalist Footer */}
      <footer className="relative z-10 w-full border-t border-white/10 py-6 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Bersama Kita. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <span onClick={() => navigate('/faq')} className="hover:text-white transition-colors cursor-pointer">FAQ</span>
            <span onClick={() => navigate('/refund-policy')} className="hover:text-white transition-colors cursor-pointer">Refund Policy</span>
            <span onClick={() => navigate('/terms')} className="hover:text-white transition-colors cursor-pointer">Terms & Conditions</span>
            <span onClick={() => navigate('/contact')} className="hover:text-white transition-colors cursor-pointer">Kontak & Bantuan</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
