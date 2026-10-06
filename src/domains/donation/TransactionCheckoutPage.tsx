import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart,
  ArrowLeft,
  CheckCircle2,
  Clock,
  QrCode,
  Copy,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../../components/feedback/Toast';
import { Donation } from '../../types';
import { formatRupiah } from '../../lib/utils';
import {
  getDonation,
  getPayment,
} from '../../integrations/firebase/firestore';
import { useAuth } from '../access/AuthContext';

interface TransactionCheckoutPageProps {
  onDataChanged?: () => Promise<void> | void;
}

export const TransactionCheckoutPage: React.FC<TransactionCheckoutPageProps> = ({
  onDataChanged,
}) => {
  const { donationId } = useParams<{ donationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [donation, setDonation] = useState<Donation | null>(null);
  const [payment, setPayment] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(3600); // Default 1 hour

  useEffect(() => {
    const fetchDonationData = async () => {
      if (!donationId) return;

      try {
        const found = await getDonation(donationId);
        if (found) {
          setDonation(found);
          
          // Check if already paid or failed
          if (found.status === 'paid' || found.status === 'refunded') {
            navigate(`/transaction/status/${donationId}`);
            return;
          }

          if (found.paymentId) {
            const p = await getPayment(found.paymentId);
            setPayment(p);

            if (p?.status === 'paid' || p?.status === 'failed' || p?.status === 'expired') {
               navigate(`/transaction/status/${donationId}`);
               return;
            }

            // Calculate exact time left if we have createdAt
            if (p?.createdAt) {
              const createdDate = new Date(p.createdAt).getTime();
              const now = new Date().getTime();
              // Duitku QRIS usually has 10 min expiry, DANA 1440 min
              // For simplicity, let's just use 1 hour from creation for the timer UI unless it's expired
              const elapsedSeconds = Math.floor((now - createdDate) / 1000);
              const remaining = Math.max(0, 3600 - elapsedSeconds);
              setTimeLeft(remaining);
            }
          }
        }
      } catch (err) {
        console.warn('fetchDonationData error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDonationData();
  }, [donationId, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCheckStatus = async () => {
    if (!donation) return;
    setCheckingStatus(true);

    try {
      const res = await fetch('/api/payments/duitku/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantOrderId: donation.id })
      });
      const data = await res.json();
      
      if (data.success) {
        if (data.statusCode === '00') {
          showToast('Pembayaran berhasil dikonfirmasi!', 'success');
          await onDataChanged?.();
          navigate(`/transaction/status/${donation.id}`);
        } else if (data.statusCode === '02') {
          showToast('Pembayaran telah dibatalkan atau kedaluwarsa.', 'error');
          await onDataChanged?.();
          navigate(`/transaction/status/${donation.id}`);
        } else {
          showToast('Pembayaran masih tertunda. Silakan selesaikan pembayaran.', 'info');
        }
      } else {
        showToast('Gagal mengecek status pembayaran.', 'warning');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan saat mengecek status.', 'error');
    } finally {
      setCheckingStatus(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Berhasil disalin ke clipboard', 'info');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B3322] mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Memuat detail instruksi pembayaran...</p>
        </div>
      </div>
    );
  }

  if (!donation || !payment) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
        <div className="p-6 max-w-lg mx-auto text-center space-y-4 pt-20">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Transaksi Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500">Data pembayaran ini tidak dapat ditemukan atau sesi Anda telah kedaluwarsa.</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-full bg-[#1B3322] text-[#B2D850] text-xs font-bold"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const isExpired = timeLeft === 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-[#B2D850] selection:text-[#1B3322]">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-8 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-full hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tutup</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#1B3322] flex items-center justify-center text-[#B2D850] shadow-xs">
              <Heart className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="font-extrabold text-sm text-[#1B3322]">Bersama Kita</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Nominal & Data</span>
          </div>
          <span className="w-8 h-0.5 bg-emerald-600" />
          <div className="flex items-center gap-2 text-emerald-800 font-bold">
            <span className="w-6 h-6 rounded-full bg-[#1B3322] text-[#B2D850] flex items-center justify-center text-xs">
              2
            </span>
            <span>Pembayaran</span>
          </div>
          <span className="w-8 h-0.5 bg-slate-200" />
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">
              3
            </span>
            <span>Lacak Bantuan</span>
          </div>
        </div>

        {/* Payment Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Pembayaran Donasi
              </span>
              <div className="text-3xl font-extrabold font-mono text-slate-900 mt-0.5">
                {formatRupiah(donation.amount)}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-1.5">
                ID: {donation.id} 
                <button onClick={() => copyToClipboard(donation.id)} className="text-emerald-600 hover:text-emerald-700">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Countdown Badge */}
            {!isExpired ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold shrink-0">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Batas Waktu: <strong className="font-mono">{formatTimer(timeLeft)}</strong></span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Pembayaran Kadaluarsa</span>
              </div>
            )}
          </div>

          {/* Payment Method UI Details */}
          {!isExpired ? (
            <div className="text-center space-y-6 pt-2">
              {payment.qrString ? (
                // QRIS rendering
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 text-[#1B3322] font-bold">
                    <QrCode className="w-5 h-5" />
                    <span>Scan QR Code (QRIS)</span>
                  </div>
                  
                  <div className="w-64 h-64 mx-auto bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-sm relative flex items-center justify-center">
                    {/* Render the QR using an external service or directly if it's an image URL. Duitku qrString is raw data, we can use a quick Google Charts QR rendering API for convenience here. */}
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payment.qrString)}`} 
                      alt="QRIS Payment"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  <p className="text-xs text-slate-500">
                    Buka aplikasi e-wallet Anda (Gopay, OVO, ShopeePay, Dana, dll) atau Mobile Banking, lalu scan QR di atas.
                  </p>
                </div>
              ) : payment.paymentUrl ? (
                // E-Money / DANA link
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 text-[#1B3322] font-bold">
                    <CreditCard className="w-5 h-5" />
                    <span>Selesaikan via Aplikasi E-Money</span>
                  </div>
                  
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Anda akan diarahkan ke halaman pembayaran atau aplikasi E-Wallet Anda untuk menyelesaikan pembayaran ini.
                  </p>

                  <a
                    href={payment.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex max-w-xs mx-auto py-3.5 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] font-extrabold text-xs shadow-lg transition-all items-center justify-center gap-2"
                  >
                    Lanjutkan Pembayaran
                  </a>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  Instruksi pembayaran tidak tersedia.
                </div>
              )}

              <hr className="border-slate-100" />

              <div className="flex flex-col items-center gap-3">
                <span className="text-xs text-slate-600">Sudah melakukan pembayaran?</span>
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  disabled={checkingStatus}
                  className="w-full max-w-xs py-3 rounded-full border border-emerald-600 text-emerald-700 font-extrabold text-xs transition-all flex items-center justify-center gap-2 hover:bg-emerald-50 disabled:opacity-60"
                >
                  {checkingStatus ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>Cek Status Pembayaran</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 pt-4">
              <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-slate-800">Waktu Pembayaran Habis</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Transaksi Anda telah kadaluarsa karena melewati batas waktu yang ditentukan.
                </p>
              </div>
            </div>
          )}

          {/* Security Assurance */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 mt-6 pt-6 border-t border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Pembayaran diverifikasi secara otomatis oleh sistem keamanan gateway (Duitku).</span>
          </div>
        </div>
      </main>

      <footer className="p-4 text-center text-xs text-slate-400 border-t border-slate-200">
        © 2026 Bersama Kita. Tanggap Bencana & Transparansi Donasi Tunai.
      </footer>
    </div>
  );
};
