import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { Disaster } from '../../types';
import {
  MAP_CENTER,
  MAP_MAX_X,
  MAP_MAX_Y,
  MAP_MIN_X,
  MAP_MIN_Y,
  MAP_SCALE,
  PROVINCE_PATHS,
  project,
} from './data/indonesiaMap';

interface EarthquakeMapProps {
  disasters: Disaster[];
  selectedDisaster: Disaster | null;
  onSelectDisaster: (disaster: Disaster) => void;
}

interface Box {
  vbX: number;
  vbY: number;
  vbW: number;
  vbH: number;
}

interface ViewState {
  k: number;
  tx: number;
  ty: number;
}

interface PendingFly {
  k: number;
  x: number;
  y: number;
}

interface DragState {
  x: number;
  y: number;
  tx: number;
  ty: number;
  markerId: string | null;
}

const MAP_W = MAP_MAX_X - MAP_MIN_X;
const MAP_H = MAP_MAX_Y - MAP_MIN_Y;
const EDGE = 0.06;
const MIN_K = 1;
const MAX_K = 8;
const FLY_MS = 1100;
const FLY_ZOOM = 2.6;
const DRAG_THRESHOLD = 4;

const SEA_COLOR = '#e9f1f7';
const LAND_COLOR = '#f8fafc';
const LAND_STROKE = '#c3d0dc';

const computeBox = (w: number, h: number): Box | null => {
  if (w <= 0 || h <= 0) return null;
  const aspect = w / h;
  const vbW = Math.max(MAP_W * (1 + EDGE), MAP_H * (1 + EDGE) * aspect);
  const vbH = vbW / aspect;
  return {
    vbX: MAP_CENTER.x - vbW / 2,
    vbY: MAP_CENTER.y - vbH / 2,
    vbW,
    vbH,
  };
};

const clampNum = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const clampView = (v: ViewState, box: Box): ViewState => {
  const k = clampNum(v.k, MIN_K, MAX_K);
  const right = box.vbX + box.vbW;
  const bottom = box.vbY + box.vbH;
  const spanX = k * MAP_W;
  const spanY = k * MAP_H;
  const tx =
    spanX <= box.vbW
      ? box.vbX + (box.vbW - spanX) / 2 - k * MAP_MIN_X
      : clampNum(v.tx, box.vbX - k * MAP_MAX_X, right - k * MAP_MIN_X);
  const ty =
    spanY <= box.vbH
      ? box.vbY + (box.vbH - spanY) / 2 - k * MAP_MIN_Y
      : clampNum(v.ty, box.vbY - k * MAP_MAX_Y, bottom - k * MAP_MIN_Y);
  return { k, tx, ty };
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const EarthquakeMap: React.FC<EarthquakeMapProps> = ({
  disasters,
  selectedDisaster,
  onSelectDisaster,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const box = useMemo(() => computeBox(size.w, size.h), [size]);

  const boxRef = useRef<Box | null>(null);
  const pendingFlyRef = useRef<PendingFly | null>(null);
  const rafRef = useRef<number | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragRef = useRef<DragState | null>(null);
  const pinchRef = useRef<{
    dist: number;
    k: number;
    mid: { x: number; y: number };
    tx: number;
    ty: number;
  } | null>(null);
  const movedRef = useRef(false);
  const detachWindowRef = useRef<(() => void) | null>(null);

  const [view, setView] = useState<ViewState>({ k: 1, tx: 0, ty: 0 });
  const viewRef = useRef<ViewState>(view);

  const applyView = (v: ViewState) => {
    viewRef.current = v;
    setView(v);
  };

  const stopAnim = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const flyTo = (k: number, px: number, py: number) => {
    const activeBox = boxRef.current;
    if (!activeBox) {
      pendingFlyRef.current = { k, x: px, y: py };
      return;
    }
    const target = clampView(
      {
        k,
        tx: activeBox.vbX + activeBox.vbW / 2 - k * px,
        ty: activeBox.vbY + activeBox.vbH / 2 - k * py,
      },
      activeBox
    );
    const from = viewRef.current;
    stopAnim();
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / FLY_MS);
      const e = easeInOutCubic(p);
      applyView(
        clampView(
          {
            k: lerp(from.k, target.k, e),
            tx: lerp(from.tx, target.tx, e),
            ty: lerp(from.ty, target.ty, e),
          },
          activeBox
        )
      );
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const clientToView = (clientX: number, clientY: number): { x: number; y: number } => {
    const activeBox = boxRef.current;
    const el = wrapRef.current;
    if (!activeBox || !el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: activeBox.vbX + ((clientX - rect.left) / Math.max(1, rect.width)) * activeBox.vbW,
      y: activeBox.vbY + ((clientY - rect.top) / Math.max(1, rect.height)) * activeBox.vbH,
    };
  };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize((prev) => {
        const w = Math.round(rect.width * 2) / 2;
        const h = Math.round(rect.height * 2) / 2;
        return prev.w === w && prev.h === h ? prev : { w, h };
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    boxRef.current = box;
    if (box) {
      const next = clampView(viewRef.current, box);
      const cur = viewRef.current;
      if (next.k !== cur.k || next.tx !== cur.tx || next.ty !== cur.ty) applyView(next);
      if (pendingFlyRef.current) {
        const pending = pendingFlyRef.current;
        pendingFlyRef.current = null;
        flyTo(pending.k, pending.x, pending.y);
      }
    }
  }, [box]);

  useEffect(() => {
    const coords = selectedDisaster?.coordinates;
    if (!coords) return;
    const p = project(coords.longitude, coords.latitude);
    flyTo(FLY_ZOOM, p.x, p.y);
    return stopAnim;
  }, [selectedDisaster?.id]);

  useEffect(
    () => () => {
      stopAnim();
      detachWindowRef.current?.();
    },
    []
  );

  const unitsPerPx = box ? box.vbW / Math.max(1, size.w) : 1;

  const handlePointerMove = (ev: PointerEvent) => {
    const id = ev.pointerId;
    if (!pointersRef.current.has(id)) return;
    const activeBox = boxRef.current;
    if (!activeBox) return;
    pointersRef.current.set(id, { x: ev.clientX, y: ev.clientY });

    if (
      dragRef.current &&
      Math.hypot(ev.clientX - dragRef.current.x, ev.clientY - dragRef.current.y) > DRAG_THRESHOLD
    ) {
      movedRef.current = true;
    }

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [a, b] = Array.from(pointersRef.current.values());
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const mid = clientToView((a.x + b.x) / 2, (a.y + b.y) / 2);
      const { k: k0, mid: mid0, tx: tx0, ty: ty0, dist: d0 } = pinchRef.current;
      const k = clampNum(k0 * (dist / d0), MIN_K, MAX_K);
      const px = (mid0.x - tx0) / k0;
      const py = (mid0.y - ty0) / k0;
      applyView(clampView({ k, tx: mid.x - k * px, ty: mid.y - k * py }, activeBox));
      return;
    }

    if (dragRef.current) {
      applyView(
        clampView(
          {
            k: viewRef.current.k,
            tx: dragRef.current.tx + (ev.clientX - dragRef.current.x) * unitsPerPx,
            ty: dragRef.current.ty + (ev.clientY - dragRef.current.y) * unitsPerPx,
          },
          activeBox
        )
      );
    }
  };

  const handlePointerUp = (ev: PointerEvent) => {
    if (!pointersRef.current.has(ev.pointerId)) return;
    pointersRef.current.delete(ev.pointerId);

    if (pointersRef.current.size === 0) {
      const drag = dragRef.current;
      if (drag && !movedRef.current && drag.markerId) {
        const target = disasters.find((d) => d.id === drag.markerId);
        if (target) onSelectDisaster(target);
      }
      dragRef.current = null;
      pinchRef.current = null;
      setIsDragging(false);
      detachWindowRef.current?.();
      detachWindowRef.current = null;
    } else if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!boxRef.current) return;
    stopAnim();

    if (pointersRef.current.size === 0) {
      movedRef.current = false;
      const markerEl = (e.target as Element | null)?.closest?.('[data-marker-id]');
      dragRef.current = {
        x: e.clientX,
        y: e.clientY,
        tx: viewRef.current.tx,
        ty: viewRef.current.ty,
        markerId: markerEl?.getAttribute('data-marker-id') ?? null,
      };
      setIsDragging(true);
    }

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      pinchRef.current = {
        dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        k: viewRef.current.k,
        mid: clientToView((a.x + b.x) / 2, (a.y + b.y) / 2),
        tx: viewRef.current.tx,
        ty: viewRef.current.ty,
      };
      movedRef.current = true;
      dragRef.current = null;
    }

    if (!detachWindowRef.current) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
      detachWindowRef.current = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };
    }
  };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const activeBox = boxRef.current;
      if (!activeBox) return;
      e.preventDefault();
      stopAnim();
      const p = clientToView(e.clientX, e.clientY);
      const current = viewRef.current;
      const k = clampNum(current.k * Math.exp(-e.deltaY * 0.0018), MIN_K, MAX_K);
      const px = (p.x - current.tx) / current.k;
      const py = (p.y - current.ty) / current.k;
      applyView(clampView({ k, tx: p.x - k * px, ty: p.y - k * py }, activeBox));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const activeBox = boxRef.current;
    if (!activeBox) return;
    const cx = activeBox.vbX + activeBox.vbW / 2;
    const cy = activeBox.vbY + activeBox.vbH / 2;
    const current = viewRef.current;
    const px = (cx - current.tx) / current.k;
    const py = (cy - current.ty) / current.k;
    flyTo(current.k * factor, px, py);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const activeBox = boxRef.current;
    if (!activeBox) return;
    e.preventDefault();
    const p = clientToView(e.clientX, e.clientY);
    const current = viewRef.current;
    const px = (p.x - current.tx) / current.k;
    const py = (p.y - current.ty) / current.k;
    flyTo(clampNum(current.k * 1.7, MIN_K, MAX_K), px, py);
  };

  const resetView = () => flyTo(1, MAP_CENTER.x, MAP_CENTER.y);

  const markerScale = box ? unitsPerPx / view.k : 1;

  const graticule = useMemo(() => {
    if (!box) return { lngs: [] as number[], lats: [] as number[], x0: 0, x1: 0, y0: 0, y1: 0 };
    const { tx, ty, k } = view;
    const toLng = (x: number) => ((x / MAP_SCALE) * 180) / Math.PI;
    const toLat = (y: number) =>
      ((Math.atan(Math.exp(-y / MAP_SCALE)) * 2 - Math.PI / 2) * 180) / Math.PI;
    const left = (box.vbX - tx) / k;
    const right = (box.vbX + box.vbW - tx) / k;
    const top = (box.vbY - ty) / k;
    const bottom = (box.vbY + box.vbH - ty) / k;
    const lngs: number[] = [];
    for (let lng = Math.ceil(toLng(left) / 5) * 5; lng <= toLng(right); lng += 5) lngs.push(lng);
    const lats: number[] = [];
    for (let lat = Math.ceil(toLat(bottom) / 5) * 5; lat <= toLat(top); lat += 5) lats.push(lat);
    return { lngs, lats, x0: left, x1: right, y0: top, y1: bottom };
  }, [box, view]);

  const selectedId = selectedDisaster?.id;

  return (
    <div
      ref={wrapRef}
      className={`relative w-full h-[440px] sm:h-[540px] lg:h-[620px] rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm select-none touch-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{ backgroundColor: SEA_COLOR }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      {box && (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`${box.vbX} ${box.vbY} ${box.vbW} ${box.vbH}`}
          role="img"
          aria-label="Peta titik bencana Indonesia"
        >
          <rect x={box.vbX} y={box.vbY} width={box.vbW} height={box.vbH} fill={SEA_COLOR} />

          <g transform={`translate(${view.tx},${view.ty}) scale(${view.k})`}>
            {/* Graticule 5° */}
            <g stroke="#8fb0c7" strokeWidth={0.6} opacity={0.35} vectorEffect="non-scaling-stroke">
              {graticule.lngs.map((lng) => (
                <line
                  key={`lng-${lng}`}
                  x1={(lng * Math.PI * MAP_SCALE) / 180}
                  y1={graticule.y0}
                  x2={(lng * Math.PI * MAP_SCALE) / 180}
                  y2={graticule.y1}
                />
              ))}
              {graticule.lats.map((lat) => {
                const y = -Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * MAP_SCALE;
                return (
                  <line
                    key={`lat-${lat}`}
                    x1={graticule.x0}
                    y1={y}
                    x2={graticule.x1}
                    y2={y}
                    stroke={lat === 0 ? '#5b8aa8' : undefined}
                    strokeWidth={lat === 0 ? 1 : undefined}
                    opacity={lat === 0 ? 0.55 : undefined}
                  />
                );
              })}
            </g>

            {/* Wilayah Indonesia (Natural Earth 50m, proyeksi Web Mercator) */}
            <g>
              {PROVINCE_PATHS.map((province) => (
                <path
                  key={province.name}
                  d={province.d}
                  fill={LAND_COLOR}
                  stroke={LAND_STROKE}
                  strokeWidth={1}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>

            {/* Marker bencana — diproyeksikan dari koordinat aktual */}
            <g>
              {disasters
                .filter((d) => d.coordinates && d.id !== selectedId)
                .map((d) => (
                  <MarkerPin key={d.id} disaster={d} scale={markerScale} isSelected={false} />
                ))}
              {disasters
                .filter((d) => d.coordinates && d.id === selectedId)
                .map((d) => (
                  <MarkerPin key={d.id} disaster={d} scale={markerScale} isSelected />
                ))}
            </g>
          </g>
        </svg>
      )}

      {/* Kontrol zoom (kiri-atas, menggantikan kontrol Leaflet) */}
      <div className="absolute top-4 left-4 z-20 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-md">
        <button
          type="button"
          aria-label="Perbesar peta"
          onClick={() => zoomBy(1.7)}
          className="p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-200" />
        <button
          type="button"
          aria-label="Perkecil peta"
          onClick={() => zoomBy(1 / 1.7)}
          className="p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-200" />
        <button
          type="button"
          aria-label="Tampilkan seluruh Indonesia"
          onClick={resetView}
          className="p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

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
            <span>
              Kedalaman: <strong className="text-slate-700">{selectedDisaster.depth}</strong>
            </span>
            <span>•</span>
            <span>
              Waktu: <strong className="text-slate-700">{selectedDisaster.eventTime}</strong>
            </span>
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

interface MarkerPinProps {
  disaster: Disaster;
  scale: number;
  isSelected: boolean;
}

const markerColor = (disaster: Disaster): string => {
  const magNum = parseFloat(disaster.magnitude) || 5.0;
  const isUrgent = magNum >= 5.5;
  const isPending = disaster.status === 'pending_verification';
  return isUrgent ? '#E11D48' : isPending ? '#D97706' : '#059669';
};

const MarkerPin: React.FC<MarkerPinProps> = ({ disaster, scale, isSelected }) => {
  const coords = disaster.coordinates;
  const { x, y } = project(coords.longitude, coords.latitude);
  const color = markerColor(disaster);

  return (
    <g
      data-marker-id={disaster.id}
      transform={`translate(${x},${y}) scale(${scale})`}
      style={{ cursor: 'pointer' }}
    >
      <title>{disaster.location || disaster.title}</title>
      <g style={{ filter: 'drop-shadow(0 3px 6px rgba(15, 23, 42, 0.28))' }}>
        <path d="M-6,-8 L6,-8 L0,0 Z" fill={color} />
        <rect
          x={-23}
          y={-25}
          width={46}
          height={17}
          rx={8.5}
          fill={color}
          stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)'}
          strokeWidth={isSelected ? 2.5 : 1.5}
        />
        <text
          x={0}
          y={-16}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#ffffff"
          fontFamily="'JetBrains Mono', monospace"
          fontSize={11}
          fontWeight={800}
        >
          <tspan fontSize={9} opacity={0.85}>
            M{' '}
          </tspan>
          <tspan>{disaster.magnitude}</tspan>
        </text>
      </g>
    </g>
  );
};
