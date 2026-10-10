import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, ArrowLeft, RefreshCw } from 'lucide-react';
import { Disaster, Donation, Partner } from '../../types';
import { DisasterList } from './DisasterList';
import { WideNavbar } from '../../components/layout/WideNavbar';
import { WideFooter } from '../../components/layout/WideFooter';

interface KatalogBMKGPageProps {
  disasters: Disaster[];
  donations: Donation[];
  partners: Partner[];
  onRefreshBMKG: () => Promise<void>;
}

export const KatalogBMKGPage: React.FC<KatalogBMKGPageProps> = ({
  disasters,
  donations,
  partners,
  onRefreshBMKG,
}) => {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshBMKG();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 selection:bg-[#0C8F63] selection:text-white">
      {/* Top Navbar */}
      <WideNavbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>BMKG Open Data Integration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Katalog Seismik BMKG & Posko Tanggap Bencana
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Arsip data seismik terkini dari BMKG yang dinormalisasi ke model bencana Bersama Kita untuk penggalangan dana darurat posko.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-all shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Memperbarui...' : 'Perbarui Data BMKG'}</span>
            </button>
          </div>
        </div>

        {/* Disaster List */}
        <DisasterList
          disasters={disasters}
          donations={donations}
          partners={partners}
          onDonateForDisaster={(disasterId) => {
            navigate(`/transaction/donate/${disasterId}`);
          }}
        />
      </main>

      {/* Footer */}
      <WideFooter />
    </div>
  );
};
