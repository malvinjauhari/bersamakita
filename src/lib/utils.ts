export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(date) + ' WIB';
  } catch {
    return dateStr;
  }
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Target penggalangan dana darurat per posko (Rp 50.000.000). */
export const FUNDRAISING_TARGET = 50000000;

const MONTHS_SHORT: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
  jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11,
};

const MONTHS_LONG: Record<string, number> = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};

/**
 * Parse waktu bencana yang bisa berupa ISO 8601 atau format BMKG:
 * - "14-Jan-26 14:53:07 WIB"
 * - "14 Januari 2026 14:53:07 WIB"
 * Diasumsikan zona waktu WIB (UTC+7) bila tidak ada info zona.
 */
export function parseEventTime(value?: string | null): Date | null {
  if (!value) return null;
  const raw = value.trim();

  // ISO 8601 (mengandung 'T' atau diakhiri 'Z')
  if (/T|Z$/.test(raw)) {
    const iso = new Date(raw);
    if (!isNaN(iso.getTime())) return iso;
  }

  // "DD-Mon-YY HH:mm[:ss] [WIB]"
  const dash = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dash) {
    const month = MONTHS_SHORT[dash[2].toLowerCase()];
    if (month !== undefined) {
      let year = parseInt(dash[3], 10);
      if (year < 100) year += 2000;
      return buildWibDate(year, month, parseInt(dash[1], 10), dash[4], dash[5], dash[6]);
    }
  }

  // "DD MMMM YYYY HH:mm[:ss] [WIB]"
  const long = raw.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (long) {
    const month = MONTHS_LONG[long[2].toLowerCase()];
    if (month !== undefined) {
      return buildWibDate(parseInt(long[3], 10), month, parseInt(long[1], 10), long[4], long[5], long[6]);
    }
  }

  // Fallback native parse
  const fallback = new Date(raw);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function buildWibDate(
  year: number,
  month: number,
  day: number,
  hour?: string,
  minute?: string,
  second?: string
): Date {
  const utcMs = Date.UTC(
    year,
    month,
    day,
    parseInt(hour || '0', 10) - 7,
    parseInt(minute || '0', 10),
    parseInt(second || '0', 10)
  );
  return new Date(utcMs);
}

/** Tanggal singkat Indonesia tanpa info waktu, contoh: "6 Okt 2026". */
export function formatShortDateIndo(value?: string | Date | null): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : parseEventTime(value);
  if (!date) return typeof value === 'string' ? value : '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/**
 * Waktu relatif ramah pengguna, contoh: "2 jam yang lalu".
 * Jatuh kembali ke tanggal singkat bila lebih dari 7 hari.
 */
export function formatRelativeTime(value?: string | Date | null): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : parseEventTime(value);
  if (!date) return typeof value === 'string' ? value : '-';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 0) return formatShortDateIndo(date);
  if (diffSec < 60) return 'baru saja';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit yang lalu`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam yang lalu`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'kemarin';
  if (diffDay < 7) return `${diffDay} hari yang lalu`;

  return formatShortDateIndo(date);
}

/** Ringkasan singkat dampak bencana untuk kartu daftar. */
export function summarizeDisasterImpact(magnitude: string, depth: string, location?: string): string {
  const mag = parseFloat(magnitude) || 0;
  const place = location ? ` di ${location}` : '';
  const depthNum = parseInt((depth || '').replace(/[^0-9]/g, ''), 10);
  const shallow = !isNaN(depthNum) && depthNum <= 60;

  if (mag >= 5.5) {
    return `Gempa berkekuatan M${magnitude}${place}${shallow ? ' dengan kedalaman dangkal' : ''} berpotensi menimbulkan kerusakan bangunan dan korban.`;
  }
  if (mag >= 5.0) {
    return `Gempa M${magnitude}${place} dirasakan cukup kuat oleh warga. Pendataan kerusakan dan kebutuhan darurat sedang berjalan.`;
  }
  return `Gempa M${magnitude}${place} tercatat oleh BMKG. Pemantauan kondisi wilayah terus dilakukan.`;
}
