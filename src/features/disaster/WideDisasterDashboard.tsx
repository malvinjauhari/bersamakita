import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Eye,
  Clock,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { Disaster, Donation, DistributionReport, Partner } from '../../types';
import { EarthquakeCard } from './EarthquakeCard';
import { EarthquakeMap } from './EarthquakeMap';
import { SelectedDisasterSection } from './SelectedDisasterSection';
import { AllocationTransparencySection } from './AllocationTransparencySection';
import { AnalisisSituasiModal } from './AnalisisSituasiModal';
import { useAuth } from '../auth/AuthContext';

interface WideDisasterDashboardProps {
  disasters: Disaster[];
  donations: Donation[];
  reports: DistributionReport[];
  partners: Partner[];
  onDonateDisaster: (disasterId: string) => void;
  onAnalyzeDisaster?: (disasterId: string) => void;
  onRefreshBMKG: () => Promise<void>;
  onOpenDonationsTab: () => void;
}

export const WideDisasterDashboard: React.FC<WideDisasterDashboardProps> = ({
  disasters,
  donations,
  reports,
  partners,
  onDonateDisaster,
  onAnalyzeDisaster,
  onRefreshBMKG,
  onOpenDonationsTab,
}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [selectedDisasterId, setSelectedDisasterId] = useState<string>(disasters[0]?.id || '');
  const [analyzingDisaster, setAnalyzingDisaster] = useState<Disaster | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Strict filter: Public views should NEVER see pending disasters
  const publishedDisasters = disasters.filter((d) => 
    ['admin_approved', 'auto_approved', 'published'].includes(d.status)
  );

  // Fallback to first disaster if selected is empty
  const activeDisaster =
    publishedDisasters.find((d) => d.id === selectedDisasterId) || publishedDisasters[0] || null;



  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Donatur';

  const handleSyncBMKG = async () => {
    setSyncing(true);
    try {
      await onRefreshBMKG();
    } finally {
      setSyncing(false);
    }
  };

  // Compute donation stats per disaster from live donations
  const getDisasterDonations = (disasterId: string) => {
    const matched = donations.filter((d) => d.disasterId === disasterId && d.status === 'paid');
    const total = matched.reduce((sum, d) => sum + d.amount, 0);
    return { total, count: matched.length };
  };

  const selectedStats = activeDisaster ? getDisasterDonations(activeDisaster.id) : { total: 0, count: 0 };

  return (
    <div className="space-y-10">
      {/* 1. HERO GREETING SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
        <div className="space-y-2.5 max-w-2xl">
          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Halo, {displayName}!
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal">
            Sumbang dana darurat bencana dan pantau rincian alokasi kebutuhan riil (pakaian, pangan, obat) yang telah diverifikasi partner posko.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('posko-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0C8F63] hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-100" />
              <span>Pantauan Bencana & Donasi</span>
            </button>

            <button
              type="button"
              onClick={onOpenDonationsTab}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold shadow-xs transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>Jejak Donasi Saya</span>
            </button>
          </div>
        </div>

        {/* Right: Perbarui Data BMKG Button */}
        <div className="flex flex-row md:flex-col items-start md:items-end gap-2.5 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={handleSyncBMKG}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Memperbarui...' : 'Perbarui Data BMKG'}</span>
          </button>
        </div>
      </div>

      {/* 2. SECTION: Lokasi Gempa Aktif & Posko Terdaftar */}
      {disasters.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center space-y-6 shadow-sm max-w-2xl mx-auto my-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200/80 text-[#1B3322] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Integritas & Verifikasi Data Posko Aktif</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Belum Ada Posko Bencana Terverifikasi
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-md mx-auto">
              Data bencana dari BMKG masuk ke antrean posko pusat dan harus diverifikasi serta di-assign ke Mitra Lapangan oleh Admin sebelum dipublikasikan untuk donasi publik.
            </p>
          </div>

          {/* Verification Rule Explanation */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100 text-left space-y-3 text-xs text-slate-700">
            <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Tahapan Verifikasi Bersama Kita:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-[11px] font-bold text-slate-600">1. Masuk BMKG</span>
                <p className="font-bold text-slate-800 text-xs">Antrean Admin</p>
                <p className="text-xs text-slate-600">Gempa masuk antrean dengan status pending verifikasi.</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-[11px] font-bold text-slate-600">2. Validasi</span>
                <p className="font-bold text-slate-800 text-xs">Persetujuan Posko</p>
                <p className="text-xs text-slate-600">Admin menunjuk Mitra Lapangan dan memvalidasi posko.</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-[11px] font-bold text-slate-600">3. Publikasi</span>
                <p className="font-bold text-slate-800 text-xs">Buka Donasi</p>
                <p className="text-xs text-slate-600">Bencana disetujui muncul di dashboard donatur.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleSyncBMKG}
              disabled={syncing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0C8F63] hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Memeriksa Pembaruan...' : 'Periksa Pembaruan Status'}</span>
            </button>

            <button
              onClick={onOpenDonationsTab}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold transition-all shadow-xs"
            >
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>Riwayat Donasi Saya</span>
            </button>
          </div>
        </div>
      ) : (
        <div id="posko-section" className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Lokasi Gempa Aktif & Posko Terdaftar
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Pilih salah satu pos bencana di bawah untuk melihat transparansi pengalokasian dana atau berdonasi langsung.
              </p>
            </div>

            <span className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 shrink-0 self-start sm:self-auto">
              {publishedDisasters.length} Posko Terdata
            </span>
          </div>

          {/* 3. SPLIT GRID: Earthquake Cards Stack (Left) + Interactive Map (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Stack of Earthquake Cards */}
            <div className="lg:col-span-7 space-y-4">
              {publishedDisasters.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-700">Belum Ada Posko Bencana Terverifikasi</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Data gempa BMKG sedang dalam tahap verifikasi admin dan pemilihan Mitra Lapangan.
                  </p>
                </div>
              ) : (
                publishedDisasters.map((disaster) => {
                  const stats = getDisasterDonations(disaster.id);
                const isSelected = activeDisaster?.id === disaster.id;

                return (
                  <EarthquakeCard
                    key={disaster.id}
                    disaster={disaster}
                    isSelected={isSelected}
                    collectedAmount={stats.total}
                    donorCount={stats.count}
                    onSelect={() => setSelectedDisasterId(disaster.id)}
                    onDonate={() => onDonateDisaster(disaster.id)}
                    onAnalyze={() => setAnalyzingDisaster(disaster)}
                  />
                );
              })
              )}
            </div>

            {/* Right Column: Sticky Leaflet Map */}
            <div className="lg:col-span-5 lg:sticky lg:top-20">
              <EarthquakeMap
                disasters={disasters}
                selectedDisaster={activeDisaster}
                onSelectDisaster={(d) => setSelectedDisasterId(d.id)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. SELECTED DISASTER DETAIL CONTAINER */}
      {activeDisaster && (
        <SelectedDisasterSection
          disaster={activeDisaster}
          collectedAmount={selectedStats.total}
          donorCount={selectedStats.count}
          partner={partners.find(p => p.id === activeDisaster.partnerId)}
          onDonateNow={() => onDonateDisaster(activeDisaster.id)}
        />
      )}

      {/* 5. TRANSPARANSI PENGGUNAAN & ALOKASI DANA */}
      <AllocationTransparencySection
        reports={reports}
        disasterTitle={activeDisaster?.title}
      />

      {/* Modal Analisis Situasi / Detail Teknis */}
      <AnalisisSituasiModal
        disaster={analyzingDisaster}
        onClose={() => setAnalyzingDisaster(null)}
        onOpenFullAnalysis={onAnalyzeDisaster}
        onDonate={(disasterId) => {
          setAnalyzingDisaster(null);
          onDonateDisaster(disasterId);
        }}
      />
    </div>
  );
};
