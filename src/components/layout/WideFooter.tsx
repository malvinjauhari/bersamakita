import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Activity, ShieldCheck, Database, Lock, Building2 } from 'lucide-react';

export const WideFooter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="w-full bg-[#0B132B] text-slate-400 text-xs border-t border-slate-800/80 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          {/* Column 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1B3322] flex items-center justify-center text-[#0C8F63] shadow-sm">
                <Heart className="w-4 h-4 fill-current" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">
                Bersama Kita
              </span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed max-w-sm">
              Platform donasi tanggap bencana transparan yang menghubungkan data gempa BMKG realtime, verifikasi kebutuhan berbasis aturan, dan pelacakan distribusi bantuan dari penyaluran hingga posko lapangan.
            </p>

            <p className="text-xs text-slate-400 italic">
              "Bersama pulihkan saudara kita, setiap langkah meninggalkan jejak kepedulian nyata."
            </p>
          </div>

          {/* Column 2: Transparansi Sistem */}
          <div className="space-y-3">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-200">
              Transparansi Sistem
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sistem otomatis yang memastikan bantuan tersalurkan secara cepat dan tepat sasaran.
            </p>
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© 2026 Bersama Kita. Tanggap Darurat Bencana & Transparansi Donasi Tunai.</p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <button type="button" onClick={() => navigate('/faq')} className="hover:text-white transition-colors">FAQ</button>
            <button type="button" onClick={() => navigate('/refund-policy')} className="hover:text-white transition-colors">Refund Policy</button>
            <button type="button" onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terms & Conditions</button>
            <button type="button" onClick={() => navigate('/contact')} className="hover:text-white transition-colors">Alamat & Kontak</button>
          </div>
        </div>
      </div>
    </footer>
  );
};
