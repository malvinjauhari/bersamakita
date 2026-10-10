import React, { useState } from 'react';
import {
  Heart,
  X,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Copy,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/feedback/Toast';
import { formatRupiah } from '../../lib/utils';
import { paymentService } from '../../services/duitku';
import {
  createDonation,
  updateDonationStatus,
  savePaymentRecord,
  updatePaymentRecord,
  addTrackingEvent,
  addAuditLog,
} from '../../services/firebase/firestore';
import { Donation, PaymentRecord, Disaster } from '../../types';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  disasters?: Disaster[];
  selectedDisasterId?: string;
  onSuccess?: (donation: Donation) => void;
}

const PRESET_AMOUNTS = [25000, 50000, 100000, 250000, 500000];

export const DonationModal: React.FC<DonationModalProps> = ({
  isOpen,
  onClose,
  disasters = [],
  selectedDisasterId,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<'amount' | 'verify' | 'payment' | 'completed'>('amount');
  const [amount, setAmount] = useState<number>(100000);
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [donorName, setDonorName] = useState<string>(profile?.displayName || 'Hamba Allah');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('Semoga lekas pulih untuk seluruh saudara kita yang terdampak.');
  const [disasterId, setDisasterId] = useState<string>(selectedDisasterId || '');
  const [confirmedCorrect, setConfirmedCorrect] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [currentDonation, setCurrentDonation] = useState<Donation | null>(null);
  const [currentPayment, setCurrentPayment] = useState<PaymentRecord | null>(null);

  if (!isOpen) return null;

  const handleSelectAmount = (val: number) => {
    setAmount(val);
    setIsCustom(false);
    setCustomAmountStr('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmountStr(raw);
    setIsCustom(true);
    const parsed = parseInt(raw, 10);
    setAmount(isNaN(parsed) ? 0 : parsed);
  };

  const proceedToVerify = () => {
    if (amount < 10000) {
      showToast('Nominal donasi minimal Rp10.000', 'warning');
      return;
    }
    setStep('verify');
  };

  const proceedToPayment = async () => {
    if (!confirmedCorrect) {
      showToast('Harap centang konfirmasi data donasi terlebih dahulu', 'warning');
      return;
    }

    setLoading(true);
    try {
      const donationId = `don-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const targetDisaster = disasters.find((d) => d.id === disasterId);

      const donationData: Donation = {
        id: donationId,
        userId: user?.uid || 'guest',
        amount: amount,
        donorName: isAnonymous ? 'Hamba Allah' : donorName || 'Donatur Peduli',
        donorEmail: user?.email || 'donatur@bersamakita.org',
        isAnonymous,
        message: message?.trim() || '',
        status: 'pending_payment',
        ...(disasterId ? { disasterId } : {}),
        ...(targetDisaster?.title ? { disasterTitle: targetDisaster.title } : {}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await createDonation(donationData);
      setCurrentDonation(donationData);

      // Create Payment through Duitku API
      const paymentResult = await paymentService.createPayment({
        donationId: donationId,
        amount: amount,
        donorName: donationData.donorName,
        donorEmail: donationData.donorEmail,
        isAnonymous: donationData.isAnonymous,
        paymentMethod: 'qris',
      });

      setCurrentPayment(paymentResult.paymentRecord);
      await savePaymentRecord(paymentResult.paymentRecord);
      
      // Open Duitku POP widget
      if ((window as any).checkout) {
        (window as any).checkout.process(paymentResult.reference, {
          successEvent: function () {
            handleSimulateStatus('paid');
          },
          pendingEvent: function () {
            setStep('payment');
          },
          errorEvent: function () {
            showToast('Pembayaran gagal', 'error');
          },
          closeEvent: function () {
            setStep('payment');
          }
        });
      } else {
        window.location.href = paymentResult.paymentUrl;
      }
    } catch (err: any) {
      showToast('Gagal memproses pembayaran: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateStatus = async (targetStatus: 'paid' | 'failed' | 'cancelled') => {
    if (!currentDonation || !currentPayment) return;
    setLoading(true);

    try {
      await updatePaymentRecord(currentPayment.id, targetStatus, currentPayment.amount);
      const updatedPayment: PaymentRecord = {
        ...currentPayment,
        status: targetStatus,
        paidAt: targetStatus === 'paid' ? new Date().toISOString() : undefined,
      };
      setCurrentPayment(updatedPayment);

      const donationStatus = targetStatus === 'paid' ? 'paid' : targetStatus === 'failed' ? 'failed' : 'expired';
      await updateDonationStatus(currentDonation.id, donationStatus, currentPayment.id);

      const updatedDonation: Donation = {
        ...currentDonation,
        status: donationStatus,
        paymentId: currentPayment.id,
      };
      setCurrentDonation(updatedDonation);

      if (targetStatus === 'paid') {
        // Record transparent tracking event in database
        const eventId = `trk-${Date.now()}-1`;
        await addTrackingEvent({
          id: eventId,
          donationId: currentDonation.id,
          type: 'donation_received',
          title: 'Donasi Berhasil Diterima',
          description: `Donasi sebesar ${formatRupiah(currentDonation.amount)} telah terverifikasi melalui sistem pembayaran Bersama Kita.`,
          timestamp: new Date().toISOString(),
          visibleToUser: true,
          createdBy: user?.uid || 'system',
        });

        // Add 2nd event: funds recorded
        const eventId2 = `trk-${Date.now()}-2`;
        await addTrackingEvent({
          id: eventId2,
          donationId: currentDonation.id,
          type: 'funds_recorded',
          title: 'Dana Tercatat dalam Rekening Penampungan',
          description: 'Dana donasi siap diajukan untuk pencairan operasional mitra tanggap darurat.',
          timestamp: new Date().toISOString(),
          visibleToUser: true,
          createdBy: 'system',
        });

        // Audit log
        await addAuditLog({
          id: `audit-${Date.now()}`,
          actorId: user?.uid || 'system',
          actorRole: profile?.role || 'user',
          actorEmail: user?.email || '',
          action: 'DONATION_PAYMENT_SUCCESS',
          entityType: 'donation',
          entityId: currentDonation.id,
          after: { amount: currentDonation.amount, status: 'paid' },
          timestamp: new Date().toISOString(),
        });

        showToast('Alhamdulillah! Donasi berhasil dibayarkan.', 'success');
        setStep('completed');
        if (onSuccess) onSuccess(updatedDonation);
      } else {
        showToast(`Status pembayaran: ${targetStatus}`, 'warning');
      }
    } catch (err: any) {
      showToast('Gagal mengubah status: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 text-slate-900 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {['Nominal', 'Verifikasi', 'Pembayaran', 'Selesai'].map((label, idx) => {
            const stepIndex = step === 'amount' ? 0 : step === 'verify' ? 1 : step === 'payment' ? 2 : 3;
            const isPassed = stepIndex >= idx;
            return (
              <React.Fragment key={idx}>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                      isPassed ? 'bg-[#1B3322] text-[#0C8F63]' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className={`text-xs font-medium ${isPassed ? 'text-slate-800' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
                {idx < 3 && <div className={`flex-1 h-0.5 ${isPassed ? 'bg-[#1B3322]' : 'bg-slate-200'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* STEP 1: SET AMOUNT */}
        {step === 'amount' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Tentukan Nominal Donasi</h3>
              <p className="text-xs text-slate-500 mt-1">
                Donasi Anda berbentuk dana tunai yang akan dialokasikan langsung untuk kebutuhan darurat korban bencana.
              </p>
            </div>

            {/* Quick Amount Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Pilih Nominal</label>
              <div className="grid grid-cols-3 gap-2.5">
                {PRESET_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSelectAmount(val)}
                    className={`py-3 px-3 rounded-2xl text-xs font-bold border transition-all ${
                      amount === val && !isCustom
                        ? 'bg-[#1B3322] text-[#0C8F63] border-[#1B3322] shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {formatRupiah(val)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Atau Masukkan Nominal Lainnya
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-sm font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  value={customAmountStr}
                  onChange={handleCustomAmountChange}
                  placeholder="Min. 10.000"
                  className="w-full pl-12 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0C8F63] text-sm font-semibold text-slate-800"
                />
              </div>
            </div>

            {/* Associated Disaster (Optional) */}
            {disasters.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tujuan Wilayah Bencana (Opsional)
                </label>
                <select
                  value={disasterId}
                  onChange={(e) => setDisasterId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0C8F63] text-xs font-medium text-slate-700 bg-white"
                >
                  <option value="">Semua Bencana Darurat Terverifikasi</option>
                  {disasters.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.magnitude} SR)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Donor Name & Anonymous */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Donatur</label>
                <input
                  type="text"
                  disabled={isAnonymous}
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0C8F63] text-xs disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-slate-300 text-[#1B3322] focus:ring-[#0C8F63] w-4 h-4"
                />
                <span className="text-xs font-medium text-slate-600">
                  Donasikan sebagai Hamba Allah (Anonim)
                </span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pesan & Doa Kebaikan</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Tuliskan doa atau pesan penyemangat..."
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0C8F63] text-xs"
                />
              </div>
            </div>

            {/* Next CTA */}
            <button
              onClick={proceedToVerify}
              className="w-full py-3.5 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#0C8F63] font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Lanjut ke Verifikasi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: VERIFICATION STEP per Section 7 */}
        {step === 'verify' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Periksa Kembali Donasi Anda</h3>
              <p className="text-xs text-slate-500 mt-1">
                Pastikan rincian donasi Anda sudah sesuai sebelum melanjutkan ke saluran pembayaran.
              </p>
            </div>

            {/* Summary Box */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Nominal Donasi</span>
                <span className="font-bold text-slate-900 text-sm font-mono">{formatRupiah(amount)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Biaya Pembayaran</span>
                <span className="font-medium text-emerald-600">Rp0 (Ditanggung)</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Nama Donatur</span>
                <span className="font-semibold text-slate-800">{isAnonymous ? 'Hamba Allah (Anonim)' : donorName}</span>
              </div>
              {disasterId && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Bencana Terkait</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                    {disasters.find((d) => d.id === disasterId)?.title}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900">Total Pembayaran</span>
                <span className="font-extrabold text-[#1B3322] text-base font-mono">
                  {formatRupiah(amount)}
                </span>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/60 border border-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedCorrect}
                onChange={(e) => setConfirmedCorrect(e.target.checked)}
                className="mt-0.5 rounded border-amber-300 text-[#1B3322] focus:ring-[#0C8F63] w-4 h-4"
              />
              <span className="text-xs text-amber-900 leading-relaxed font-medium">
                Saya memastikan data donasi sudah benar dan menyetujui penyaluran dana sesuai evaluasi kebutuhan darurat mitra di lapangan.
              </span>
            </label>

            {/* CTA Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('amount')}
                className="px-5 py-3 rounded-full border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={loading || !confirmedCorrect}
                onClick={proceedToPayment}
                className="flex-1 py-3.5 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#0C8F63] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Lanjutkan Pembayaran</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PAYMENT SCREEN & SIMULATOR per Section 7 & 8 */}
        {step === 'payment' && currentPayment && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex p-2.5 rounded-full bg-amber-100 text-amber-800 mb-2">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Menunggu Pembayaran</h3>
              <p className="text-xs text-slate-500 mt-1">
                Selesaikan pembayaran Anda menggunakan QRIS atau Virtual Account di bawah ini.
              </p>
            </div>

            {/* Removed disclaimer pill */}

            {/* QRIS / VA Display Box */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center space-y-4">
              <div className="inline-block p-4 bg-white rounded-2xl shadow-sm border border-slate-200">
                <QrCode className="w-36 h-36 mx-auto text-slate-800" />
                <p className="text-[10px] font-mono text-slate-400 mt-2">Scan QRIS Bersama Kita</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Nomor Virtual Account (Mandiri / BCA / BSI):</span>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-base font-bold text-slate-900">
                    {currentPayment.vaNumber || '1179001411202112'}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentPayment.vaNumber || '1179001411202112');
                      showToast('Nomor VA disalin!', 'info');
                    }}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-500"
                    title="Salin VA"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between text-xs px-2">
                <span className="text-slate-500">Total Tagihan:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {formatRupiah(currentPayment.amount)}
                </span>
              </div>
            </div>

            {/* Interactive Status Simulation Controls */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                Validasi Pembayaran
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSimulateStatus('paid')}
                  className="py-2.5 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cek Status Pembayaran (Simulasi Bayar)</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSimulateStatus('failed')}
                  className="py-2.5 px-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors"
                >
                  <span>Batalkan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: COMPLETED */}
        {step === 'completed' && currentDonation && (
          <div className="text-center space-y-6 py-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-900">Donasi Berhasil Diterima</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Terima kasih telah menjadi bagian dari Bersama Kita. Donasi Anda sebesar{' '}
                <span className="font-bold text-slate-900">{formatRupiah(currentDonation.amount)}</span> telah tercatat
                secara transparan.
              </p>
            </div>

            {/* Tracking shortcut card */}
            <div className="p-4 rounded-2xl bg-[#1B3322] text-white text-left space-y-2">
              <div className="flex items-center gap-2 text-[#0C8F63] text-xs font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Pelacakan Transparan Aktif</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Anda dapat memantau status alokasi dana, konfirmasi mitra, hingga dokumentasi penyaluran barang bantuan secara langsung di tab Pelacakan.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-full bg-[#0C8F63] hover:bg-[#9CDE64] text-[#1B3322] font-bold text-xs transition-colors shadow-md"
            >
              Lihat Riwayat & Pelacakan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
