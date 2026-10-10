import React from 'react';
import { WideNavbar } from '../../components/layout/WideNavbar';
import { WideFooter } from '../../components/layout/WideFooter';
import { HelpCircle } from 'lucide-react';

export const FaqPage: React.FC = () => {
  const faqs = [
    { q: "Apakah website ini nyata?", a: "Website ini adalah prototipe untuk keperluan kompetisi/Hackathon. Segala transaksi dan data di dalamnya bersifat simulasi dan tidak digunakan untuk tujuan komersial nyata." },
    { q: "Bagaimana cara kerja platform ini?", a: "Platform ini mensimulasikan penarikan data seismik dari BMKG secara real-time, mengotomasi verifikasi kebutuhan darurat, dan melacak transparansi donasi hingga ke posko penyaluran." },
    { q: "Apakah uang donasi yang saya bayar nyata?", a: "TIDAK. Sistem pembayaran diintegrasikan menggunakan mode sandbox (pengujian). Jangan pernah menggunakan kartu kredit asli Anda atau melakukan transfer nyata di platform ini." },
    { q: "Bagaimana cara kerja penyaluran bantuan?", a: "Penyaluran dikelola secara terpusat oleh Admin, lalu diteruskan ke dompet Mitra Lapangan. Mitra akan membelanjakan dan mengunggah bukti transparansi yang dapat dilacak langsung oleh donatur." }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800">
      <WideNavbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">FAQ</h1>
        </div>
        
        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-2">{faq.q}</h3>
              <p className="text-slate-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </main>
      <WideFooter />
    </div>
  );
};
