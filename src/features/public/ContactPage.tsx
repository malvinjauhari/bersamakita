import React from 'react';
import { WideNavbar } from '../../components/layout/WideNavbar';
import { WideFooter } from '../../components/layout/WideFooter';
import { MapPin, Mail, Phone, Building } from 'lucide-react';

export const ContactPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800">
      <WideNavbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Alamat & Kontak</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-xl font-bold text-slate-800">Hubungi Developer Hackathon</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Karena ini adalah platform prototipe, kontak di bawah ini bersifat simulasi operasional. Jika Anda merupakan juri, mentor, atau investor yang tertarik mendiskusikan arsitektur sistem ini lebih lanjut, Anda dapat menghubungi tim developer.
            </p>
            
            <div className="space-y-5 pt-4">
              <div className="flex items-center gap-4 text-slate-700">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email (Simulasi)</div>
                  <div className="font-medium">hello@bersamakita.id</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-slate-700">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telepon (Simulasi)</div>
                  <div className="font-medium">+62 811 2233 4455</div>
                </div>
              </div>
              
              <div className="flex items-start gap-4 text-slate-700">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kantor Pusat (Simulasi)</div>
                  <div className="font-medium leading-relaxed">
                    Gedung Inovasi Teknologi Lt. 4<br/>
                    Kawasan SCBD, Sudirman<br/>
                    Jakarta Selatan, Indonesia 12190
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 p-8 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-center text-center">
             <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
             <h3 className="text-2xl font-bold text-white mb-4 z-10">Mendukung Transparansi</h3>
             <p className="text-slate-300 text-sm leading-relaxed z-10 max-w-sm mx-auto">
               Kami percaya inovasi teknologi dapat memulihkan harapan melalui penyaluran bantuan yang aman, terstruktur, dan dapat dipertanggungjawabkan sepenuhnya kepada donatur publik.
             </p>
             <div className="mt-8 z-10">
               <span className="inline-flex items-center justify-center px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold border border-indigo-500/30">
                 Hackathon Project 2026
               </span>
             </div>
          </div>
        </div>
      </main>
      <WideFooter />
    </div>
  );
};
