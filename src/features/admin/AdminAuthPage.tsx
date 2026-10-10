import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/feedback/Toast';

const CAROUSEL_IMAGES = [
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1532629345422-7515f3d16bb7?auto=format&fit=crop&w=1920&q=80',
];

export const AdminAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdminAuthenticated, loginStaff } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState<string>('bersamakita.my.id@protonmail.com');
  const [password, setPassword] = useState<string>('bersamakita01');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-scroll images
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

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
        <div className="absolute inset-0 bg-black/60" />

        {/* Header / Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-3 relative z-10 text-left group">
          <div className="w-10 h-10 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <img src="/assets/images/logo.svg" alt="Logo" className="w-10 h-10" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-white tracking-wide text-sm">BERSAMA KITA</span>
            <span className="font-extrabold text-emerald-300 text-lg tracking-wider">CHARITY</span>
          </div>
        </button>

        {/* Main Illustration Area */}
        <main className="relative z-10 flex-1 flex flex-col justify-center py-12 max-w-sm">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
            Sistem Operasional<br/>Terpusat.
          </h2>
          <p className="text-white/80 font-medium text-sm">
            Kelola donasi, tinjau laporan lapangan, dan pastikan setiap bantuan tersalurkan tepat sasaran.
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

        <div className="w-full max-w-[360px] mx-auto flex flex-col justify-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
            Admin Login
          </h1>
          <p className="text-sm text-gray-500 mb-8 font-medium">Akses eksklusif untuk administrator sistem.</p>


          
          <form onSubmit={handleAdminLogin} className="space-y-4 text-sm text-left">
            <div className="space-y-1.5">
              <label className="block text-gray-700 text-xs font-semibold">Email Administrator</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bersamakita.org"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0C8F63] focus:border-transparent text-sm transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-gray-700 text-xs font-semibold">Kata Sandi</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0C8F63] focus:border-transparent text-sm transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 mt-2 rounded-xl bg-[#0C8F63] hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>Masuk ke Panel Admin</span>
            </button>
          </form>
        </div>

        {/* Global Footer (Right Side Bottom) */}
        <footer className="mt-16 md:mt-auto flex flex-col md:flex-row items-center md:items-end justify-between text-[11px] text-gray-400 font-medium">
          <span className="mb-2 md:mb-0">Sistem Operasional Terproteksi</span>
          <div className="text-center md:text-right">
            Need technical support?<br/>
            <a href="mailto:admin@bersamakita.org" className="underline hover:text-gray-600 transition-colors">admin@bersamakita.org</a>
          </div>
        </footer>
      </div>

    </div>
  );
};
