import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, LogIn, UserCheck } from 'lucide-react';
import { Donation } from '../../types';
import { DonationHistory } from './DonationHistory';
import { WideNavbar } from '../../components/layout/WideNavbar';
import { WideFooter } from '../../components/layout/WideFooter';
import { useAuth } from '../auth/AuthContext';

interface MyDonationsPageProps {
  donations: Donation[];
}

export const MyDonationsPage: React.FC<MyDonationsPageProps> = ({ donations }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 selection:bg-[#0C8F63] selection:text-white">
      {/* Top Navbar */}
      <WideNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <Heart className="w-3.5 h-3.5 fill-current text-emerald-600" />
                <span>Jejak Kebaikan Anda</span>
              </div>

              {user && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Akun: <strong>{user.displayName || user.email}</strong></span>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Donasi Saya & Pelacakan Bantuan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Pantau perjalanan dana kontribusi Anda secara transparan per nominal, mulai dari verifikasi pembayaran escrow, alokasi kebutuhan fisik oleh partner, hingga penyerahan langsung ke posko bencana.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl bg-[#0C8F63] hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
            >
              + Mulai Donasi Baru
            </button>
          </div>
        </div>

        {/* Unauthenticated State Prompt */}
        {!user ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm text-center max-w-xl mx-auto space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
              <LogIn className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900">
                Masuk untuk Melihat Riwayat & Lacak Donasi Anda
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                Demi transparansi, keamanan data, dan akurasi pelacakan, data donasi dan laporan aktual penyaluran dikaitkan secara eksklusif dengan masing-masing akun donatur.
              </p>
            </div>
            <button
              onClick={() => navigate('/auth/login?redirect=/my-donation')}
              className="px-6 py-3 rounded-xl bg-[#0C8F63] hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all hover:scale-105 cursor-pointer inline-flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk dengan Google</span>
            </button>
          </div>
        ) : (
          /* Authenticated User Content: Donation History Cards & Timeline */
          <div className="space-y-10">
            <DonationHistory
              donations={donations}
              onOpenDonate={() => navigate('/')}
              onResumePayment={(donId) => navigate(`/transaction/checkout/${donId}`)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <WideFooter />
    </div>
  );
};
