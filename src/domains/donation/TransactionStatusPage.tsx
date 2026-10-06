import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  FileCheck2,
} from 'lucide-react';
import { Donation, Disaster } from '../../types';
import { formatRupiah } from '../../lib/utils';
import { getDonation, getDisasters } from '../../integrations/firebase/firestore';
import { useAuth } from '../access/AuthContext';

export const TransactionStatusPage: React.FC = () => {
  const { donationId } = useParams<{ donationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [donation, setDonation] = useState<Donation | null>(null);
  const [disaster, setDisaster] = useState<Disaster | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadInfo = async () => {
      if (!donationId) return;

      try {
        const foundDonation = await getDonation(donationId);
        setDonation(foundDonation);

        if (foundDonation) {
          const disasterList = await getDisasters('published');
          const d = disasterList.find((item) => item.id === foundDonation?.disasterId);
          setDisaster(d || null);
        }
      } catch (err) {
        console.warn('Error loading donation status info:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInfo();
  }, [donationId, user]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-[#B2D850] selection:text-[#1B3322]">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-8 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="w-7 h-7 rounded-full bg-[#1B3322] flex items-center justify-center text-[#B2D850] shadow-xs">
              <Heart className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="font-extrabold text-sm text-[#1B3322]">Bersama Kita</span>
          </div>

          <span className="text-xs font-mono font-semibold text-slate-400">Bukti Transaksi Resmi</span>
        </div>
      </header>

      {/* Main Status Container */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Nominal & Data</span>
          </div>
          <span className="w-8 h-0.5 bg-emerald-600" />
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Pembayaran</span>
          </div>
          <span className="w-8 h-0.5 bg-emerald-600" />
          <div className="flex items-center gap-2 text-emerald-800 font-bold">
            <span className="w-6 h-6 rounded-full bg-[#1B3322] text-[#B2D850] flex items-center justify-center text-xs">
              3
            </span>
            <span>Lacak Bantuan</span>
          </div>
        </div>

        {/* Success Hero Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-lg text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border-4 border-emerald-100 shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Transaksi Terverifikasi & Lunas
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight pt-1">
              Terima Kasih, Donasi Anda Diterima!
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              Setiap rupiah dana yang Anda kontribusikan kini tersimpan dalam rekening escrow posko darurat dan siap dipetakan ke kebutuhan fisik riil.
            </p>
          </div>

          {/* Receipt Breakdown Card */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-3 text-xs">
            <div className="flex justify-between items-baseline border-b border-slate-200/60 pb-2">
              <span className="text-slate-400 text-[11px]">Total Kontribusi:</span>
              <span className="font-mono text-xl font-extrabold text-slate-900">
                {donation ? formatRupiah(donation.amount) : 'Rp 0'}
              </span>
            </div>

            <div className="space-y-1.5 text-slate-600 text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">ID Transaksi:</span>
                <span className="font-mono font-semibold text-slate-800">{donationId}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Donatur:</span>
                <span className="font-semibold text-slate-800">{donation?.donorName}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Posko Tujuan:</span>
                <span className="font-semibold text-slate-800 line-clamp-1 max-w-[200px] text-right">
                  {disaster?.title || 'Posko Tanggap Darurat Bencana'}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Waktu Pembayaran:</span>
                <span className="font-mono text-slate-700">
                  {donation ? new Date(donation.createdAt).toLocaleString('id-ID') : '-'}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Status Dana:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Escrow Terproteksi</span>
                </span>
              </div>
            </div>
          </div>

          {/* Next Steps CTA */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => navigate('/my-donation')}
              className="w-full py-4 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Pantau Status Penyaluran di Donasi Saya</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-400 border-t border-slate-200">
        © 2026 Bersama Kita. Tanggap Bencana & Transparansi Donasi Tunai.
      </footer>
    </div>
  );
};
