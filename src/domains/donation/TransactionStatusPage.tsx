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
  Clock,
  XCircle,
  Loader2,
  AlertTriangle,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B3322] mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Memuat status transaksi...</p>
        </div>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
        <div className="p-6 max-w-lg mx-auto text-center space-y-4 pt-20">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Transaksi Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500">
            Data transaksi ini tidak dapat ditemukan atau sesi Anda telah kedaluwarsa.
          </p>
          <div className="flex flex-col items-center gap-2 pt-2">
            <button
              onClick={() => navigate('/cek-transaksi')}
              className="px-5 py-2.5 rounded-full bg-[#1B3322] text-[#B2D850] text-xs font-bold"
            >
              Lihat Transaksi Saya
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = donation.status === 'paid';
  const isPending = donation.status === 'pending_payment';

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
          <span className={`w-8 h-0.5 ${isPaid ? 'bg-emerald-600' : isPending ? 'bg-amber-400' : 'bg-slate-200'}`} />
          <div className="flex items-center gap-2 text-slate-400">
            {isPaid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  isPending ? 'bg-amber-400 text-amber-950 font-bold' : 'bg-slate-200 text-slate-600'
                }`}
              >
                2
              </span>
            )}
            <span>Pembayaran</span>
          </div>
          <span className={`w-8 h-0.5 ${isPaid ? 'bg-emerald-600' : 'bg-slate-200'}`} />
          <div className={`flex items-center gap-2 ${isPaid ? 'text-emerald-800 font-bold' : 'text-slate-400'}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                isPaid ? 'bg-[#1B3322] text-[#B2D850]' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </span>
            <span>Lacak Bantuan</span>
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-lg text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div
            className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center border-4 shadow-sm ${
              isPaid
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : isPending
                ? 'bg-amber-50 text-amber-600 border-amber-100'
                : 'bg-rose-50 text-rose-600 border-rose-100'
            }`}
          >
            {isPaid ? (
              <CheckCircle2 className="w-9 h-9" />
            ) : isPending ? (
              <Clock className="w-9 h-9" />
            ) : (
              <XCircle className="w-9 h-9" />
            )}
          </div>

          <div className="space-y-1.5">
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${
                isPaid
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : isPending
                  ? 'text-amber-800 bg-amber-50 border-amber-200'
                  : 'text-rose-700 bg-rose-50 border-rose-200'
              }`}
            >
              {isPaid ? 'Transaksi Terverifikasi & Lunas' : isPending ? 'Menunggu Pembayaran' : 'Pembayaran Tidak Berhasil'}
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight pt-1">
              {isPaid
                ? 'Terima Kasih, Donasi Anda Diterima!'
                : isPending
                ? 'Pembayaran Anda Belum Selesai'
                : 'Transaksi Gagal atau Dibatalkan'}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              {isPaid
                ? 'Setiap rupiah dana yang Anda kontribusikan kini tersimpan dalam rekening escrow posko darurat dan siap dipetakan ke kebutuhan fisik riil.'
                : isPending
                ? 'Instruksi pembayaran sudah diterbitkan. Selesaikan pembayaran sebelum batas waktu agar donasi Anda tercatat dan dapat segera disalurkan.'
                : 'Pembayaran ini tidak dapat diproses. Anda dapat memulai donasi baru kapan saja untuk membantu posko tanggap darurat.'}
            </p>
          </div>

          {/* Receipt Breakdown Card */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-3 text-xs">
            <div className="flex justify-between items-baseline border-b border-slate-200/60 pb-2">
              <span className="text-slate-400 text-[11px]">Nominal Donasi:</span>
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
                <span className="text-slate-400">
                  {isPaid ? 'Waktu Pembayaran:' : 'Waktu Transaksi:'}
                </span>
                <span className="font-mono text-slate-700">
                  {new Date(donation.createdAt).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Status Dana:</span>
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Escrow Terproteksi</span>
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Menunggu Pembayaran</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Tidak Berhasil</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Next Steps CTA */}
          <div className="space-y-2.5 pt-2">
            {isPaid ? (
              <>
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
              </>
            ) : isPending ? (
              <>
                <button
                  onClick={() => navigate(`/transaction/checkout/${donationId}`)}
                  className="w-full py-4 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>Selesaikan Pembayaran</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => navigate('/cek-transaksi')}
                  className="w-full py-3 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  Lihat Transaksi Saya
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-4 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>Mulai Donasi Baru</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => navigate('/cek-transaksi')}
                  className="w-full py-3 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  Lihat Transaksi Saya
                </button>
              </>
            )}
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
