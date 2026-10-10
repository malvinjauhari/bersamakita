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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 selection:bg-[#B2D850] selection:text-[#1B3322]">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-full hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#1B3322] flex items-center justify-center text-[#B2D850]">
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
          className="w-full py-2.5 px-4 rounded-full bg-[#1B3322] text-[#B2D850] text-xs font-bold hover:bg-[#243E2C] transition-all shadow-xs"
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
          className="w-full py-2.5 px-4 rounded-full bg-[#1B3322] text-[#B2D850] text-xs font-bold hover:bg-[#243E2C] transition-all shadow-xs"
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-[#B2D850] selection:text-[#1B3322]">
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
            <div className="w-7 h-7 rounded-full bg-[#1B3322] flex items-center justify-center text-[#B2D850] shadow-xs">
              <Heart className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="font-extrabold text-sm text-[#1B3322]">Bersama Kita</span>
          </div>
        </div>
      </header>

      {/* Main Flow Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <form onSubmit={handleSubmitTransaction} className="space-y-8">
          {/* Step Breadcrumb Indicator */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2 text-emerald-800 font-bold">
              <span className="w-6 h-6 rounded-full bg-[#1B3322] text-[#B2D850] flex items-center justify-center text-xs">
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

          {/* Selected Posko Banner Card */}
          {selectedDisaster && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                  <span>Posko Bencana Tanggap Darurat</span>
                </div>
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                  {selectedDisaster.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedDisaster.location}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>Kedalaman: {selectedDisaster.depth}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{formatRelativeTime(selectedDisaster.eventTime)}</span>
                  </span>
                </div>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center font-mono shrink-0">
                <span className="text-[10px] text-emerald-600 font-bold">MAG</span>
                <span className="text-lg font-extrabold text-emerald-800 leading-none">
                  {selectedDisaster.magnitude}
                </span>
              </div>
            </div>
          )}

          {/* 2-Column Split: Donation Inputs (Left) & Payment / Summary (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Nominal, Donor Details */}
            <div className="lg:col-span-7 space-y-6">
              {/* Section 1: Nominal */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    1. Pilih Nominal Donasi Tunai
                  </h2>
                  <p className="text-xs text-slate-500">
                    Setiap rupiah dihimpun dalam rekening posko darurat untuk dibelanjakan kebutuhan fisik riil.
                  </p>
                </div>

                {/* Preset Buttons */}
                <div className="grid grid-cols-3 gap-2.5">
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
                        className={`py-3 px-2 rounded-2xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-[#1B3322] text-[#B2D850] border-[#1B3322] shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {formatRupiah(amt)}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Atau Masukkan Nominal Bebas:
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      min={10000}
                      step={5000}
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                      }}
                      placeholder="Contoh: 150000"
                      className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#B2D850]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Donor Data */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    2. Identitas Donatur
                  </h2>
                  <p className="text-xs text-slate-500">
                    Data Anda tersimpan aman dan digunakan untuk penerbitan bukti donasi resmi.
                  </p>
                </div>

                {/* Anonymous Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">
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
                    className="w-4 h-4 accent-[#1B3322] cursor-pointer"
                  />
                </div>

                {!isAnonymous && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Lengkap:
                    </label>
                    <input
                      type="text"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="Masukkan nama donatur"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#B2D850]"
                      required={!isAnonymous}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Konfirmasi:
                    </label>
                    <input
                      type="email"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      placeholder="email@domain.com"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#B2D850]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      No. WhatsApp (Opsional):
                    </label>
                    <input
                      type="tel"
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                      placeholder="08123456789"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#B2D850]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Doa atau Pesan Solidaritas (Opsional):
                  </label>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tuliskan harapan dan doa untuk saudara kita di lokasi posko bencana..."
                    className="w-full p-3 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#B2D850] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Payment Method & Final Summary */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
              {/* Payment Method Selector — QRIS only */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  3. Metode Pembayaran
                </h2>

                <div className="p-3.5 rounded-2xl border border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <QrCode className="w-5 h-5 text-[#B2D850]" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">QRIS</span>
                      <span className="text-[11px] text-slate-500">
                        BCA, Mandiri, GoPay, OVO, ShopeePay, Dana — scan dari aplikasi bank/e-wallet
                        Anda
                      </span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Satu-satunya metode pembayaran yang tersedia. Nominal donasi Anda tetap utuh
                  sebagai dana penggalangan — biaya administrasi 0,17% dibayar terpisah di atas
                  nominal donasi.
                </p>
              </div>

              {/* Order Total & Submit CTA */}
              <div className="bg-[#1B3322] rounded-3xl p-6 text-white shadow-xl space-y-5">
                <div className="space-y-2 border-b border-white/10 pb-4 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Donasi</span>
                    <span className="font-mono font-bold text-white">{formatRupiah(finalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Biaya Admin 0,17%</span>
                    <span className="font-mono font-bold text-amber-300">{formatRupiah(adminFee)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-300">Total Dibayar:</span>
                  <span className="text-2xl font-extrabold font-mono text-[#B2D850]">
                    {formatRupiah(totalPayment)}
                  </span>
                </div>

                {/* Transparent fee explainer */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#B2D850]">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Kenapa ada biaya admin?</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Biaya administrasi digunakan untuk memastikan nominal dana donasi yang
                    tercatat dalam penggalangan tetap utuh setelah proses transaksi.
                  </p>
                  <div className="pt-1.5 border-t border-white/10 font-mono text-[10px] text-slate-400 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Donasi</span>
                      <span>{formatRupiah(finalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Biaya Admin 0,17%</span>
                      <span>{formatRupiah(adminFee)}</span>
                    </div>
                    <div className="flex justify-between text-slate-200 font-bold">
                      <span>Total Dibayar</span>
                      <span>{formatRupiah(totalPayment)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-full bg-[#B2D850] hover:bg-[#9CDE64] text-[#1B3322] font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#1B3322]" />
                  ) : (
                    <Heart className="w-4 h-4 fill-current" />
                  )}
                  <span>Bayar {formatRupiah(totalPayment)} via QRIS ➔</span>
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Donasi {formatRupiah(finalAmount)} tercatat utuh • biaya {formatRupiah(adminFee)} transparan</span>
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
