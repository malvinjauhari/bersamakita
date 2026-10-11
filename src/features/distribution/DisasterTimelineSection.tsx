import React, { useCallback, useEffect, useState } from 'react';
import {
  Clock,
  Landmark,
  HandCoins,
  Truck,
  ClipboardCheck,
  FileCheck2,
  Megaphone,
  Info,
  MapPin,
  Loader2,
  Send,
  HeartHandshake,
} from 'lucide-react';
import { DisasterTimelineEvent, DisasterTimelineEventType } from '../../types';
import { getDisasterTimelineEvents, addDisasterTimelineEvent } from '../../services/firebase/firestore';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/feedback/Toast';
import { formatDateIndo } from '../../lib/utils';

const EVENT_META: Record<
  DisasterTimelineEventType,
  { label: string; icon: React.ReactNode; accent: string }
> = {
  disbursement_created: {
    label: 'Pencairan',
    icon: <Landmark className="w-3.5 h-3.5" />,
    accent: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  funds_disbursed: {
    label: 'Dana Dipercepat',
    icon: <HandCoins className="w-3.5 h-3.5" />,
    accent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  funds_received_by_partner: {
    label: 'Dana Diterima Mitra',
    icon: <HeartHandshake className="w-3.5 h-3.5" />,
    accent: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  distribution_started: {
    label: 'Penyaluran Dimulai',
    icon: <Truck className="w-3.5 h-3.5" />,
    accent: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  milestone_updated: {
    label: 'Progres Penyaluran',
    icon: <ClipboardCheck className="w-3.5 h-3.5" />,
    accent: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  report_submitted: {
    label: 'Laporan Diajukan',
    icon: <FileCheck2 className="w-3.5 h-3.5" />,
    accent: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  report_published: {
    label: 'Laporan Terbit',
    icon: <FileCheck2 className="w-3.5 h-3.5" />,
    accent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  fundraising_closed: {
    label: 'Penutupan',
    icon: <Megaphone className="w-3.5 h-3.5" />,
    accent: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  partner_update: {
    label: 'Update Mitra',
    icon: <Megaphone className="w-3.5 h-3.5" />,
    accent: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  system: {
    label: 'Sistem',
    icon: <Info className="w-3.5 h-3.5" />,
    accent: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

interface DisasterTimelineSectionProps {
  disasterId: string;
  disasterTitle?: string;
  /** Izinkan admin/partner menambahkan update manual dari UI ini. */
  allowPost?: boolean;
  compact?: boolean;
  onChanged?: () => void;
}

/**
 * Timeline penyaluran KOLEKTIF per bencana (`disasterTimeline/{disasterId}/events`).
 * Dilihat identik oleh SEMUA donatur bencana yang sama — tanpa PII donatur.
 */
export const DisasterTimelineSection: React.FC<DisasterTimelineSectionProps> = ({
  disasterId,
  disasterTitle,
  allowPost,
  compact,
  onChanged,
}) => {
  const { user, isAdminAuthenticated, isPartnerAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [events, setEvents] = useState<DisasterTimelineEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [posting, setPosting] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');
  const [location, setLocation] = useState<string>('');

  const canPost = allowPost && (isAdminAuthenticated || isPartnerAuthenticated);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getDisasterTimelineEvents(disasterId);
    setEvents(data);
    setLoading(false);
  }, [disasterId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('Tulis isi pembaruan terlebih dahulu', 'warning');
      return;
    }
    setPosting(true);
    try {
      const evt: DisasterTimelineEvent = {
        id: `tl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        disasterId,
        disasterTitle,
        type: 'partner_update',
        title: 'Pembaruan Penyaluran dari Mitra',
        description: description.trim(),
        location: location.trim() || undefined,
        actorRole: isAdminAuthenticated ? 'admin' : 'partner',
        actorName: user?.email || undefined,
        createdAt: new Date().toISOString(),
      };
      await addDisasterTimelineEvent(evt);
      setDescription('');
      setLocation('');
      showToast('Pembaruan timeline berhasil dipublikasikan', 'success');
      await load();
      onChanged?.();
    } catch (err: any) {
      showToast('Gagal mempublikasikan pembaruan: ' + err.message, 'error');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {canPost && (
        <form
          onSubmit={handlePost}
          className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-2.5"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
            <Send className="w-3.5 h-3.5" />
            <span>Tambahkan Pembaruan Penyaluran (kolektif — dilihat semua donatur)</span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Contoh: Rombongan 1 tiba di posko, 250 paket sembako mulai dibagikan..."
            className="w-full p-3 rounded-xl border border-amber-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none bg-white"
          />
          <div className="flex gap-2">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Lokasi (opsional)"
              className="flex-1 px-3 py-2 rounded-xl border border-amber-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            />
            <button
              type="submit"
              disabled={posting}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
            >
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Publikasikan
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Memuat timeline...
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Belum ada pembaruan penyaluran untuk bencana ini.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Timeline ini sinkron untuk semua donatur — pantau terus perkembangan bantuan.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((evt, idx) => {
            const meta = EVENT_META[evt.type] || EVENT_META.system;
            const isFirst = idx === 0;
            return (
              <div
                key={evt.id}
                className={`relative flex gap-3 ${compact ? '' : 'pl-4'} ${isFirst ? '' : 'ml-1'}`}
              >
                {!compact && (
                  <span className="absolute left-0 top-6 bottom-0 w-px bg-slate-200" aria-hidden />
                )}
                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center border ${meta.accent} ${compact ? '' : 'relative z-10'}`}>
                  {meta.icon}
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.accent}`}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateIndo(evt.createdAt)}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">{evt.title}</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5 whitespace-pre-line">
                    {evt.description}
                  </p>
                  {evt.location && (
                    <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {evt.location}
                    </p>
                  )}
                  {evt.actorName && (
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      oleh {evt.actorName} · {evt.actorRole === 'admin' ? 'Admin' : 'Mitra Lapangan'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};