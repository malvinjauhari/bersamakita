import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const HackathonBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-100 bg-amber-400 text-amber-950 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">
            PROTOTYPE HACKATHON: Website ini adalah prototipe yang dibangun khusus untuk keperluan kompetisi/Hackathon. Bukan untuk penggunaan komersial atau transaksi nyata.
          </p>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-amber-500 rounded-full transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
