import React from 'react';
import { WideNavbar } from '../../components/layout/WideNavbar';
import { WideFooter } from '../../components/layout/WideFooter';
import { FileText } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800">
      <WideNavbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Terms and Conditions</h1>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-8">
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">1. Sifat Aplikasi Prototipe</h3>
            <p className="text-slate-600 leading-relaxed">Dengan mengakses platform <strong>Bersama Kita</strong>, Anda menyetujui bahwa Anda memahami sifat aplikasi ini sebagai proyek prototipe Hackathon. Ini bukan platform komersial yang beroperasi secara legal untuk mengumpulkan donasi masyarakat saat ini. Anda dilarang keras menggunakannya untuk menipu orang lain.</p>
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">2. Penggunaan Layanan (Simulasi)</h3>
            <p className="text-slate-600 leading-relaxed">Layanan yang disediakan, termasuk penarikan data gempa dari BMKG Open Data, sistem verifikasi, dan manajemen donasi bersifat demonstrasi teknologi. Kami menyajikan fitur ini secara "as is" (apa adanya) untuk memperlihatkan kapabilitas integrasi React, Vite, Express, dan Cloud Firestore.</p>
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">3. Keamanan Data Pengguna</h3>
            <p className="text-slate-600 leading-relaxed">Sistem autentikasi kami menggunakan Google Sign-In dari Firebase Auth. Kami hanya menyimpan identitas publik yang diperlukan (nama dan email) di dalam database proyek uji coba kami untuk mensimulasikan kepemilikan data donatur. Data ini tidak akan dibagikan, dijual, atau dimanfaatkan di luar ruang lingkup Hackathon.</p>
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">4. Penafian Tanggung Jawab (Disclaimer)</h3>
            <p className="text-slate-600 leading-relaxed">Developer tidak bertanggung jawab secara hukum maupun finansial atas kerugian yang mungkin timbul apabila pihak ketiga menyalahgunakan platform ini, antarmuka, atau logonya untuk menggalang donasi palsu (fraud).</p>
          </div>
        </div>
      </main>
      <WideFooter />
    </div>
  );
};
