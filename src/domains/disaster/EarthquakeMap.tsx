import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Disaster } from '../../types';

interface EarthquakeMapProps {
  disasters: Disaster[];
  selectedDisaster: Disaster | null;
  onSelectDisaster: (disaster: Disaster) => void;
}

export const EarthquakeMap: React.FC<EarthquakeMapProps> = ({
  disasters,
  selectedDisaster,
  onSelectDisaster,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = selectedDisaster?.coordinates?.latitude || 3.5;
      const initialLng = selectedDisaster?.coordinates?.longitude || 125.5;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 6,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Add Zoom Control to top-left matching screenshot
      L.control.zoom({ position: 'topleft' }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    // Render markers for each disaster
    disasters.forEach((d) => {
      if (!d.coordinates) return;
      const isSelected = selectedDisaster?.id === d.id;
      const magNum = parseFloat(d.magnitude) || 5.0;

      // Determine color based on status and magnitude per legend
      const isUrgent = magNum >= 5.5;
      const isPending = d.status === 'pending_verification';
      const bgColor = isUrgent ? '#E11D48' : isPending ? '#D97706' : '#059669';

      const customIcon = L.divIcon({
        className: 'custom-quake-pin',
        html: `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            transform: translate(-50%, -100%);
            cursor: pointer;
          ">
            <div style="
              background-color: ${bgColor};
              color: white;
              font-family: monospace;
              font-size: 11px;
              font-weight: 800;
              padding: 3px 7px;
              border-radius: 8px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.25);
              border: ${isSelected ? '2.5px solid white' : '1.5px solid rgba(255,255,255,0.7)'};
              display: flex;
              align-items: center;
              gap: 3px;
              white-space: nowrap;
            ">
              <span style="font-size: 9px; opacity: 0.85;">M</span>
              <span>${d.magnitude}</span>
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 7px solid ${bgColor};
              margin-top: -1px;
            "></div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([d.coordinates.latitude, d.coordinates.longitude], {
        icon: customIcon,
      }).addTo(map);

      marker.on('click', () => {
        onSelectDisaster(d);
      });

      markersRef.current[d.id] = marker;
    });

    // Fly to selected disaster
    if (selectedDisaster?.coordinates) {
      map.flyTo(
        [selectedDisaster.coordinates.latitude, selectedDisaster.coordinates.longitude],
        6.5,
        { duration: 1.2 }
      );
    }
  }, [disasters, selectedDisaster]);

  return (
    <div className="relative w-full h-[620px] rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm bg-slate-100">
      {/* Leaflet map container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Right Legend Card per screenshot */}
      <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-md border border-slate-100 text-slate-800 text-[11px] space-y-2 pointer-events-auto max-w-[200px]">
        <div className="font-bold text-[10px] uppercase tracking-wider text-slate-700">
          Pantauan Seismik
        </div>
        <div className="space-y-1.5 font-medium text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
            <span>Bantuan Mendesak (M ≥ 5.5)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span>Menunggu Verifikasi</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
            <span>Terverifikasi Aktif</span>
          </div>
        </div>
      </div>

      {/* Center Top Callout of Selected Disaster matching screenshot */}
      {selectedDisaster && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 text-xs text-slate-800 space-y-1 pointer-events-auto max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="font-bold text-slate-900 leading-snug line-clamp-2">
            {selectedDisaster.location || selectedDisaster.title}
          </div>
          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2">
            <span>Kedalaman: <strong className="text-slate-700">{selectedDisaster.depth}</strong></span>
            <span>•</span>
            <span>Waktu: <strong className="text-slate-700">{selectedDisaster.eventTime}</strong></span>
          </div>
          <div className="pt-1">
            <span
              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                selectedDisaster.status === 'pending_verification'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {selectedDisaster.status === 'pending_verification'
                ? 'Menunggu Verifikasi (24 jam)'
                : 'Terverifikasi & Aktif'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
