import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Circle,
  Building2,
  FileCheck2,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  Route,
  Package,
  Truck,
  MapPin,
  HeartHandshake,
  CheckCheck,
  ShieldCheck,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { Donation, TrackingEvent, DistributionReport, PartnerAllocation } from '../../types';
import {
  getTrackingEventsForDonation,
  getDistributionReports,
  getPartnerAllocations,
  ensureAllocationForDonation,
} from '../../integrations/firebase/firestore';
import { formatRupiah, formatDateIndo } from '../../lib/utils';
import { DistributionProgressCard } from '../distribution/DistributionProgressCard';

interface TrackingTimelineProps {
  donations: Donation[];
  selectedDonationId?: string;
}

export const TrackingTimeline: React.FC<TrackingTimelineProps> = ({
  donations,
  selectedDonationId,
}) => {
  const paidDonations = donations.filter((d) => d.status === 'paid');
  const [activeDonationId, setActiveDonationId] = useState<string>(
    selectedDonationId || paidDonations[0]?.id || ''
  );
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [reports, setReports] = useState<DistributionReport[]>([]);
  const [allocations, setAllocations] = useState<PartnerAllocation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (selectedDonationId) {
      setActiveDonationId(selectedDonationId);
    } else if (!activeDonationId && paidDonations.length > 0) {
      setActiveDonationId(paidDonations[0].id);
    }
  }, [selectedDonationId, paidDonations, activeDonationId]);

  const currentDonation = donations.find((d) => d.id === activeDonationId);

  useEffect(() => {
    if (!activeDonationId) return;

    let isMounted = true;
    setLoading(true);

    async function loadData() {
      try {
        const evs = await getTrackingEventsForDonation(
          activeDonationId,
          currentDonation?.userId
        );
        const reps = await getDistributionReports();
        let allocs = await getPartnerAllocations();

        // Ensure this specific donation nominal has its dedicated field allocation & report
        if (currentDonation && currentDonation.status === 'paid') {
          const hasLinked = allocs.some((a) => a.sourceDonationIds?.includes(activeDonationId));
          if (!hasLinked) {
            await ensureAllocationForDonation(currentDonation);
            allocs = await getPartnerAllocations();
          }
        }

        if (isMounted) {
          setEvents(evs);
          setReports(reps);
          setAllocations(allocs);
        }
      } catch (err) {
        console.error('Error loading tracking timeline:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [activeDonationId, currentDonation]);

  // Strictly find the allocation linked to THIS specific donation ID (NO falling back to other users' allocations!)
  const linkedAllocation = allocations.find((a) =>
    a.sourceDonationIds?.includes(activeDonationId)
  );

  // Strictly find the report linked to this allocation (NO cross-user leak!)
  const linkedReport = linkedAllocation
    ? reports.find((r) => r.allocationId === linkedAllocation.id)
    : undefined;

  const pendingDonation = donations.find((d) => d.status === 'pending_payment');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B3322] uppercase tracking-wider mb-1">
            <Route className="w-4 h-4 text-emerald-600" />
            <span>Pelacakan Transparan Dana Donasi</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Perjalanan Dana Hingga Bantuan Tersalurkan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Pantau setiap langkah penyaluran donasi Anda dari atas ke bawah, seperti pelacakan paket ekspedisi terpercaya dengan dokumentasi foto langsung dari mitra lapangan.
          </p>
        </div>

        {currentDonation && (
          <div className="bg-emerald-50/70 border border-emerald-200/80 px-4 py-3 rounded-2xl sm:text-right shrink-0">
            <span className="text-[11px] font-semibold text-emerald-700 block">
              Nominal Terpilih
            </span>
            <span className="text-lg font-mono font-extrabold text-slate-900">
              {formatRupiah(currentDonation.amount)}
            </span>
          </div>
        )}
      </div>

      {/* Select Active Donation Selector if User has multiple donations */}
      {paidDonations.length > 1 && (
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Pilih Riwayat Donasi Anda:
          </span>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {paidDonations.map((d) => (
              <button
                key={d.id}
                onClick={() => setActiveDonationId(d.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  activeDonationId === d.id
                    ? 'bg-[#1B3322] text-[#B2D850] border-[#1B3322] shadow-sm scale-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                Donasi {formatRupiah(d.amount)} • {d.disasterTitle || 'Tanggap Darurat'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State if No Paid Donations Yet */}
      {paidDonations.length === 0 ? (
        <div className="bg-white p-12 sm:p-16 rounded-3xl border border-slate-100 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Route className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-800">
              Belum Ada Riwayat Donasi Berhasil pada Akun Ini
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {pendingDonation
                ? `Anda memiliki donasi ${formatRupiah(pendingDonation.amount)} yang masih menunggu pembayaran. Selesaikan pembayaran untuk mengaktifkan pelacakan alur penyaluran bantuan ke posko.`
                : 'Setelah Anda melakukan transaksi donasi yang berhasil, progres vertikal perjalanan dana ke mitra lapangan akan tampil di sini.'}
            </p>
          </div>
          {pendingDonation && (
            <a
              href={`/transaction/checkout/${pendingDonation.id}`}
              className="inline-flex items-center gap-2 mt-2 px-6 py-3 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#B2D850] text-xs font-bold transition-all shadow-md"
            >
              <span>Lanjutkan Pembayaran ({formatRupiah(pendingDonation.amount)})</span>
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Donation Meta Information Card */}
          {currentDonation && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 font-bold">
                  ✓
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-mono">ID: {currentDonation.id}</span>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {currentDonation.disasterTitle || 'Tanggap Bencana Lapangan'}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDateIndo(currentDonation.createdAt)}</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-600">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Metode: {currentDonation.paymentMethod === 'va_bca_simulated' ? 'Virtual Account BCA' : 'QRIS Resmi'}</span>
                </div>

                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[11px]">
                  Terverifikasi Escrow
                </span>
              </div>
            </div>
          )}

          {/* Main Layout: Vertical Shopee-Style Stepper & Field Reports Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Main Column: Shopee-Style Vertical Progress Card */}
            <div className="lg:col-span-8">
              {linkedAllocation ? (
                <DistributionProgressCard
                  allocation={linkedAllocation}
                  donorDonation={currentDonation}
                  mode="donor"
                />
              ) : (
                <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center space-y-3">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto animate-spin" />
                  <p className="text-xs text-slate-500">
                    Menghubungkan kartu alokasi operasional mitra...
                  </p>
                </div>
              )}
            </div>

            {/* Right Side Column: Official Field Evidence & Verification Certificate */}
            <div className="lg:col-span-4 space-y-6">
              {/* Evidence & Report Summary */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-[#1B3322]">
                  <FileCheck2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Laporan Aktual Lapangan
                  </h3>
                </div>

                {linkedReport || linkedAllocation ? (
                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Mitra Pelaksana:</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {linkedReport?.partnerName || linkedAllocation?.partnerName}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Posko / Lokasi Lapangan:</span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>
                          {linkedReport?.location ||
                            linkedAllocation?.targetLocation ||
                            'Posko Bencana Lapangan'}
                        </span>
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Tanggal Pelaksanaan:</span>
                      <span className="font-medium text-slate-700">
                        {linkedReport?.distributionDate ||
                          (linkedAllocation?.updatedAt
                            ? formatDateIndo(linkedAllocation.updatedAt)
                            : 'Sedang berlangsung')}
                      </span>
                    </div>

                    {/* Notes / Progress update */}
                    {(linkedReport?.notes || linkedAllocation?.packedItemsSummary) && (
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 font-medium leading-relaxed">
                        &quot;
                        {linkedReport?.notes ||
                          `Bantuan berupa: ${linkedAllocation?.packedItemsSummary}`}
                        &quot;
                      </div>
                    )}

                    {/* Photo Documentation */}
                    {(linkedReport?.photoUrls && linkedReport.photoUrls.length > 0) ||
                    linkedAllocation?.evidencePhotoUrl ? (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                          Dokumentasi Serah Terima:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {(
                            linkedReport?.photoUrls ||
                            (linkedAllocation?.evidencePhotoUrl
                              ? [linkedAllocation.evidencePhotoUrl]
                              : [])
                          ).map((url, i) => (
                            <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200">
                              <img
                                src={url}
                                alt="Bukti Dokumentasi"
                                className="w-full h-24 object-cover group-hover:scale-105 transition-transform"
                              />
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-1 right-1 p-1 bg-black/60 rounded text-white"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-400 text-center">
                        Foto dokumentasi lapangan akan diunggah oleh mitra saat serah terima
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-2 text-xs text-slate-500">
                    <Clock className="w-6 h-6 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-700">Menunggu Laporan Mitra</p>
                    <p className="text-[11px] text-slate-400">
                      Setelah mitra menyelesaikan pembagian bantuan di lokasi bencana, rincian item aktual dan dokumentasi akan tampil di panel ini.
                    </p>
                  </div>
                )}
              </div>

              {/* Digital Transparency Seal Card */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1B3322] to-[#243E2C] text-white space-y-3 shadow-md">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#B2D850]" />
                  <span className="font-bold text-xs uppercase tracking-wider text-[#B2D850]">
                    Sertifikat Transparansi
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Setiap transaksi donasi melewati rekening penampungan resmi Bersama Kita. Mitra lapangan diwajibkan mengunggah foto berita acara dan menandai setiap langkah kronologis.
                </p>
                <div className="pt-1 text-[11px] font-mono text-[#B2D850]/80 border-t border-white/10">
                  Status: Terverifikasi Sistem
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
