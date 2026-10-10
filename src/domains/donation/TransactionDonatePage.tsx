import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart,
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Clock,
  Layers,
  CheckCircle2,
  Lock,
  Loader2,
  QrCode,
  Building,
  PauseCircle,
  Info,
} from 'lucide-react';
import { useAuth } from '../access/AuthContext';
import { useToast } from '../../components/feedback/Toast';
import { Disaster, Donation } from '../../types';
import { formatRupiah, formatRelativeTime } from '../../lib/utils';
import { calculateAdminFee, calculateTotalPayment } from '../../lib/fees';
import {
  createDonation,
  savePaymentRecord,
  addTrackingEvent,
  getDisasterById,
} from '../../integrations/firebase/firestore';
import { paymentService } from '../../integrations/duitku/payment-service';

declare global {
  interface Window {
    checkout: any;
  }
}

interface TransactionDonatePageProps {
  disasters: Disaster[];
  onDataChanged: () => Promise<void>;
  /** Explicit disaster ID (dispatcher route uses `:id`, not `:disasterId`) */
  disasterId?: string;
}

export const TransactionDonatePage: React.FC<TransactionDonatePageProps> = ({
  disasters,
  onDataChanged,
  disasterId: disasterIdProp,
}) => {
  const routeParams = useParams<{ disasterId: string }>();
  const disasterId = disasterIdProp ?? routeParams.disasterId;
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const listedDisaster = disasters.find((d) => d.id === disasterId);
  const [remoteDisaster, setRemoteDisaster] = useState<Disaster | null>(null);
  const [lookupDone, setLookupDone] = useState<boolean>(false);

  const presetAmounts = [25000, 50000, 100000, 250000, 500000, 1000000];
  const [selectedAmount, setSelectedAmount] = useState<number>(100000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [donorName, setDonorName] = useState<string>(
    profile?.displayName || user?.displayName || ''
  );
  const [donorEmail, setDonorEmail] = useState<string>(
    user?.email || ''
  );
  const [donorPhone, setDonorPhone] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Direct-link lookup: the disaster may be hidden from the public feed query
  // (pending, rejected, or archived/closed) but still needs to be resolvable by ID
  // so we can show an accurate screen instead of silently falling back to another disaster.
  useEffect(() => {
    let cancelled = false;
    if (listedDisaster) {
      setRemoteDisaster(null);
      setLookupDone(true);
      return;
    }
    if (!disasterId) {
      setLookupDone(true);
      return;
    }
    setLookupDone(false);
    getDisasterById(disasterId).then((found) => {
      if (cancelled) return;
      setRemoteDisaster(found);
      setLookupDone(true);
    });
    return () => {
      cancelled = true;
    };
  }, [disasterId, listedDisaster]);

  const selectedDisaster = listedDisaster ?? remoteDisaster;
  const isClosed = selectedDisaster?.status === 'archived';

  const renderPageChrome = (children: React.ReactNode) => (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 selection:bg-[#0C8F63] selection:text-white">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-full hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#1B3322] flex items-center justify-center text-[#0C8F63]">
            <Heart className="w-3.5 h-3.5 fill-current" />
          </div>
          <span className="font-extrabold text-sm text-[#1B3322]">Bersama Kita</span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">{children}</main>
    </div>
  );

  if (!selectedDisaster) {
    if (!lookupDone) {
      return renderPageChrome(
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-[#1B3322]" />
          <p className="text-xs font-semibold">Memuat data bencana...</p>
        </div>
      );
    }
    return renderPageChrome(
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200/60">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900">Bencana Tidak Ditemukan</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Data bencana ini tidak tersedia, belum disetujui admin posko, atau telah dihapus. Donasi publik hanya dibuka untuk bencana yang telah terverifikasi demi transparansi dan akuntabilitas.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-2.5 px-4 rounded-full bg-[#1B3322] text-[#0C8F63] text-xs font-bold hover:bg-[#243E2C] transition-all shadow-xs"
        >
          Kembali ke Dashboard Posko
        </button>
      </div>
    );
  }

  if (isClosed) {
    return renderPageChrome(
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-5 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto border border-slate-200">
          <PauseCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <span className="inline-block px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Penggalangan Ditutup
          </span>
          <h2 className="text-lg font-bold text-slate-900 leading-snug">
            {selectedDisaster.title}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Penggalangan dana untuk posko ini telah dihentikan oleh tim Admin Bersama Kita dan tidak lagi menerima donasi baru. Riwayat donasi yang telah tercatat tetap tersimpan dengan aman.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs text-left">
          <div className="flex items-center gap-2 text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{selectedDisaster.location}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Terjadi: {formatRelativeTime(selectedDisaster.eventTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              M {selectedDisaster.magnitude} — Kedalaman {selectedDisaster.depth}
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-2.5 px-4 rounded-full bg-[#1B3322] text-[#0C8F63] text-xs font-bold hover:bg-[#243E2C] transition-all shadow-xs"
        >
          Lihat Posko Lain di Dashboard
        </button>
      </div>
    );
  }

  const finalAmount = customAmount ? parseInt(customAmount, 10) || 0 : selectedAmount;
  // Transparent 0,17% admin fee — single source: src/lib/fees.ts
  const adminFee = calculateAdminFee(finalAmount);
  const totalPayment = calculateTotalPayment(finalAmount);

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('Silakan login terlebih dahulu untuk melanjutkan donasi', 'info');
      navigate(`/auth/login?redirect=/transaction/donate/${selectedDisaster?.id || ''}`);
      return;
    }

    if (finalAmount < 10000) {
      showToast('Minimum donasi adalah Rp10.000', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const donationId = `don-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const paymentId = `pay-${donationId}`;
      const referenceId = `BK-${Date.now()}`;

      const newDonation: Donation = {
        id: donationId,
        disasterId: selectedDisaster.id,
        disasterTitle: selectedDisaster.title,
        userId: user.uid,
        amount: finalAmount,
        donorName: isAnonymous ? 'Hamba Allah' : donorName || 'Donatur Peduli',
        donorEmail: donorEmail || user.email || 'donatur@bersamakita.org',
        isAnonymous,
        message: message.trim() || '',
        status: 'pending_payment',
        paymentMethod: 'qris',
        paymentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save initial donation record
      await createDonation(newDonation);

      // Create Payment through Duitku API (QRIS only)
      const paymentResult = await paymentService.createPayment({
        donationId,
        userId: user.uid,
        amount: finalAmount,
        donorName: newDonation.donorName,
        donorEmail: newDonation.donorEmail,
        isAnonymous,
        paymentMethod: 'qris',
      });

      // Save payment transaction record
      await savePaymentRecord(paymentResult.paymentRecord);

      // Initial tracking event: Menunggu Pembayaran
      await addTrackingEvent({
        id: `trk-${Date.now()}`,
        donationId,
        userId: user.uid,
        type: 'donation_received',
        title: 'Instruksi Pembayaran Diterbitkan',
        description: `Menunggu konfirmasi pembayaran sebesar ${formatRupiah(totalPayment)} (donasi ${formatRupiah(finalAmount)} + biaya admin ${formatRupiah(adminFee)}) melalui QRIS.`,
        visibleToUser: true,
        createdBy: user.uid,
        timestamp: new Date().toISOString(),
      });

      await onDataChanged();
      showToast('Instruksi pembayaran berhasil dibuat', 'success');
      
      // Navigate to checkout directly, removing the Duitku POP mock integration
      navigate(`/transaction/checkout/${donationId}`);
    } catch (err: any) {
      showToast('Gagal memproses donasi: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-[#0C8F63] selection:text-white">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-full hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Peta Bencana</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#1B3322] flex items-center justify-center text-[#0C8F63] shadow-xs">
              <Heart className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="font-extrabold text-sm text-[#1B3322]">Bersama Kita</span>
          </div>
        </div>
      </header>

      {/* Main Flow Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <form onSubmit={handleSubmitTransaction} className="space-y-8">
          {/* Step Breadcrumb Indicator */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                1
              </span>
              <span>Nominal & Data Donasi</span>
            </div>
            <span className="w-8 h-0.5 bg-slate-200" />
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">
                2
              </span>
              <span>Pembayaran (QRIS)</span>
            </div>
            <span className="w-8 h-0.5 bg-slate-200" />
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">
                3
              </span>
              <span>Lacak Bantuan</span>
            </div>
          </div>

          {/* 2-Column Split: Donation Inputs (Left) & Payment / Summary (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Nominal, Donor Details */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              
              {/* Section 1: Nominal */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    1. Pilih Nominal Donasi Tunai
                  </h2>
                  <p className="text-xs text-slate-500">
                    Setiap rupiah dihimpun dalam rekening posko darurat untuk dibelanjakan kebutuhan fisik riil.
                  </p>
                </div>

                {/* Preset Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  {presetAmounts.map((amt) => {
                    const isSelected = selectedAmount === amt && !customAmount;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setSelectedAmount(amt);
                          setCustomAmount('');
                        }}
                        className={`py-3 px-2 rounded-xl text-sm font-semibold transition-all border ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-600 shadow-sm'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-emerald-500'
                        }`}
                      >
                        {formatRupiah(amt)}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Atau Masukkan Nominal Bebas:
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-sm font-semibold text-slate-400">Rp</span>
                    <input
                      type="number"
                      min={10000}
                      step={5000}
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                      }}
                      placeholder="Contoh: 150000"
                      className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Donor Data */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    2. Identitas Donatur
                  </h2>
                  <p className="text-xs text-slate-500">
                    Data Anda tersimpan aman dan digunakan untuk penerbitan bukti donasi resmi.
                  </p>
                </div>

                {/* Anonymous Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="font-semibold text-sm text-slate-800 block">
                      Donasi sebagai Hamba Allah
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Nama Anda disamarkan di daftar donatur publik
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {!isAnonymous && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nama Lengkap:
                    </label>
                    <input
                      type="text"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="Masukkan nama donatur"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required={!isAnonymous}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Konfirmasi:
                    </label>
                    <input
                      type="email"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      placeholder="email@domain.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      No. WhatsApp (Opsional):
                    </label>
                    <input
                      type="tel"
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                      placeholder="08123456789"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Doa atau Pesan Solidaritas (Opsional):
                  </label>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tuliskan harapan dan doa untuk saudara kita di lokasi posko bencana..."
                    className="w-full p-3.5 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary, QRIS, Posko Info */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-24">
              
              {/* Posko Target Summary */}
              {selectedDisaster && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                    <span>Tujuan Donasi</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {selectedDisaster.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{selectedDisaster.location}</span>
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-emerald-700">MAG {selectedDisaster.magnitude}</span>
                  </div>
                </div>
              )}

              {/* Order Summary & Payment Method */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Rincian Pembayaran
                  </h3>

                  <div className="p-3 rounded-xl border border-[#0C8F63] bg-[#0C8F63] flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
                        <QrCode className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-white block">QRIS</span>
                        <span className="text-[10px] text-white/90">
                          BCA, Mandiri, GoPay, OVO, ShopeePay, Dana
                        </span>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Nominal Donasi</span>
                    <span className="font-mono font-semibold text-slate-900">{formatRupiah(finalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <div className="flex items-center gap-1">
                      <span>Biaya Admin (0,17%)</span>
                      <div className="group relative flex items-center">
                        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          Biaya administrasi digunakan untuk memastikan nominal dana donasi yang tercatat tetap utuh.
                        </div>
                      </div>
                    </div>
                    <span className="font-mono font-semibold text-slate-900">{formatRupiah(adminFee)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline border-t border-slate-100 pt-4">
                  <span className="text-sm font-bold text-slate-900">Total Tagihan</span>
                  <span className="text-2xl font-extrabold font-mono text-emerald-600">
                    {formatRupiah(totalPayment)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Heart className="w-4 h-4 fill-current" />
                  )}
                  <span>Bayar Sekarang via QRIS ➔</span>
                </button>

                <div className="flex justify-center">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pembayaran diverifikasi otomatis oleh gateway resmi.</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-400 border-t border-slate-200 mt-8">
        © 2026 Bersama Kita. Tanggap Bencana & Transparansi Donasi Tunai.
      </footer>
    </div>
  );
};
