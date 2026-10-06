import React from 'react';
import { WideNavbar } from '../../components/layout/WideNavbar';
import { WideFooter } from '../../components/layout/WideFooter';
import { RefreshCcw } from 'lucide-react';

export const RefundPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800">
      <WideNavbar />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
            <RefreshCcw className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Refund Policy (Kebijakan Pengembalian)</h1>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="text-rose-700 font-bold bg-rose-50 p-5 rounded-xl border border-rose-100 mb-8 leading-relaxed">
            PENTING: Website ini adalah prototipe yang dibuat untuk Hackathon. Tidak ada transaksi finansial nyata yang terjadi, sehingga tidak ada kebijakan pengembalian dana komersial.
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">1. Status Transaksi</h3>
              <p className="text-slate-600 leading-relaxed">Semua donasi yang disimulasikan melalui platform ini menggunakan payment gateway dalam lingkungan Sandbox (Uji Coba). Tidak ada pendebetan dana nyata dari rekening Anda. Anda tidak perlu meminta refund karena uang Anda tidak pernah diproses secara nyata.</p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">2. Proses Refund (Skema Simulasi)</h3>
              <p className="text-slate-600 leading-relaxed">Dalam skenario operasional nyata, platform donasi tanggap bencana dirancang agar donasi yang telah disalurkan ke mitra lapangan tidak dapat ditarik kembali (non-refundable), kecuali terdapat kegagalan sistem pada saat pemrosesan payment gateway sebelum dana didistribusikan.</p>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">3. Hubungi Kami</h3>
              <p className="text-slate-600 leading-relaxed">Jika Anda tidak sengaja memasukkan data rahasia/nyata ke dalam form prototipe ini, harap segera menghubungi tim developer melalui halaman Kontak agar kami dapat segera melakukan penghapusan data dari database simulasi.</p>
            </div>
          </div>
        </div>
      </main>
      <WideFooter />
    </div>
  );
};
