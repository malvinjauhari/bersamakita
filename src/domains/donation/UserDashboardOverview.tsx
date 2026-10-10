import React from 'react';
import {
  Heart,
  Activity,
  Route,
  ShieldCheck,
  Building2,
  ArrowRight,
  Sparkles,
  MapPin,
  Clock,
} from 'lucide-react';
import { Disaster, Donation, Partner } from '../../types';
import { formatRupiah, formatDateIndo } from '../../lib/utils';
import { useAuth } from '../access/AuthContext';

interface UserDashboardOverviewProps {
  disasters: Disaster[];
  donations: Donation[];
  partners: Partner[];
  onOpenDonate: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenTracking: (donationId: string) => void;
}

export const UserDashboardOverview: React.FC<UserDashboardOverviewProps> = ({
  disasters,
  donations,
  partners,
  onOpenDonate,
  onNavigateTab,
  onOpenTracking,
}) => {
  const { profile } = useAuth();

  const userPaidDonations = donations.filter((d) => d.status === 'paid');
  const totalUserDonation = userPaidDonations.reduce((sum, d) => sum + d.amount, 0);

  // Only approved disasters for user
  const publishedDisasters = disasters.filter((d) =>
    ['admin_approved', 'auto_approved', 'published'].includes(d.status)
  );

  const latestDisaster = publishedDisasters[0];
  const latestDonation = userPaidDonations[0];

  return (
    <div className="space-y-6">
      {/* Welcome & Primary CTA Banner per Section 6 */}
      <div className="bg-gradient-to-r from-[#1B3322] via-[#243E2C] to-[#1B3322] rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0C8F63]/20 text-[#0C8F63] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Satu Kepedulian, untuk Mereka yang Membutuhkan</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {profile?.displayName || 'Donatur'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Donasi tunai Anda dialokasikan langsung kepada mitra resmi terverifikasi dan dapat dipantau perkembangannya secara transparan.
          </p>
        </div>

        {/* Primary CTA Button: Mulai Donasi per Section 6 */}
        <button
          onClick={onOpenDonate}
          className="z-10 px-7 py-3.5 rounded-full bg-[#0C8F63] hover:bg-[#9CDE64] text-[#1B3322] font-bold text-sm transition-all shadow-lg shadow-[#0C8F63]/20 flex items-center gap-2 hover:scale-105 active:scale-95 shrink-0"
        >
          <Heart className="w-4 h-4 fill-current" />
          <span>Mulai Donasi</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-8">
          <Heart className="w-72 h-72" />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500">Donasi Saya yang Tersalurkan</span>
          <div className="text-2xl font-extrabold text-[#1B3322] font-mono">
            {formatRupiah(totalUserDonation)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">
            {userPaidDonations.length} kali berdonasi
          </span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500">Bencana Terverifikasi BMKG</span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {publishedDisasters.length} Bencana
          </div>
          <span className="text-[11px] text-slate-400">Data seismik resmi terverifikasi</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500">Mitra Operasional Lapangan</span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {partners.length} Mitra Resmi
          </div>
          <span className="text-[11px] text-slate-400">PMI, BAZNAS, & Relawan Siaga</span>
        </div>
      </div>

      {/* Two Columns: Latest Disaster Alert & Latest Donation Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Verified Disaster Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Activity className="w-4 h-4 text-rose-500" />
                <span>Bencana Terkini Terverifikasi</span>
              </div>
              <button
                onClick={() => onNavigateTab('disasters')}
                className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {latestDisaster ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    {latestDisaster.magnitude} SR
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Kedalaman {latestDisaster.depth}</span>
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    ✓ Valid
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm leading-snug">{latestDisaster.title}</h4>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{latestDisaster.location}</span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada data bencana baru yang terverifikasi.
              </div>
            )}
          </div>

          {latestDisaster && (
            <button
              onClick={onOpenDonate}
              className="w-full py-2.5 rounded-full bg-[#1B3322] hover:bg-[#243E2C] text-[#0C8F63] text-xs font-bold transition-colors shadow-sm"
            >
              Kirim Donasi Bantuan
            </button>
          )}
        </div>

        {/* Latest Donation & Tracking Shortcut */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Route className="w-4 h-4 text-emerald-600" />
                <span>Pelacakan Donasi Terakhir</span>
              </div>
              <button
                onClick={() => onNavigateTab('tracking')}
                className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
              >
                <span>Buka Pelacakan</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {latestDonation ? (
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-emerald-900">
                    {formatRupiah(latestDonation.amount)}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    Berhasil Diterima
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {latestDonation.disasterTitle || 'Tanggap Darurat Kebencanaan'}
                </p>
                <div className="text-[11px] text-slate-400 font-mono">
                  {formatDateIndo(latestDonation.createdAt)}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada donasi aktif. Mulai donasi pertama Anda untuk memantau pelacakan dana.
              </div>
            )}
          </div>

          {latestDonation && (
            <button
              onClick={() => onOpenTracking(latestDonation.id)}
              className="w-full py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Route className="w-3.5 h-3.5 text-emerald-600" />
              <span>Lihat Detail Timeline Penyaluran</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
