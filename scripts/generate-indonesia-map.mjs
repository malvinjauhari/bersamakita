/**
 * Generator asset peta Indonesia (SVG path) untuk EarthquakeMap.
 *
 * Sumber : Natural Earth 50m admin-1 states/provinces (public domain)
 *          https://github.com/nvkelso/natural-earth-vector
 * Proyeksi: Web Mercator, y diarahkan ke bawah (koordinat SVG).
 *
 * Jalankan: node scripts/generate-indonesia-map.mjs
 * Output  : src/domains/disaster/data/indonesiaMap.ts (jangan diedit manual)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson';

const SCALE = 1000; // view units per radian
const OUTPUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'domains',
  'disaster',
  'data',
  'indonesiaMap.ts'
);

const toRad = (deg) => (deg * Math.PI) / 180;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + toRad(lat) / 2));
const project = (lng, lat) => [toRad(lng) * SCALE, -mercY(lat) * SCALE];

const ringsOf = (geometry) => {
  const { type, coordinates } = geometry;
  if (type === 'Polygon') return coordinates;
  if (type === 'MultiPolygon') return coordinates.flat();
  return [];
};

const fmt = (n) => {
  const s = n.toFixed(2);
  return s.endsWith('.00') ? s.slice(0, -3) : s.replace(/\.?0+$/, '');
};

const main = async () => {
  console.log(`Mengunduh ${SOURCE_URL} ...`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Gagal mengunduh: HTTP ${res.status}`);
  const geo = await res.json();

  const features = geo.features.filter((f) => f.properties?.admin === 'Indonesia');
  if (features.length === 0) throw new Error('Tidak ada fitur Indonesia pada sumber data.');
  console.log(`${features.length} provinsi ditemukan.`);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let pointCount = 0;
  const provinces = [];

  for (const feature of features) {
    const name = feature.properties?.name || 'Unknown';
    const parts = [];
    for (const ring of ringsOf(feature.geometry)) {
      if (ring.length < 4) continue;
      const coords = ring.map(([lng, lat]) => {
        const [x, y] = project(lng, lat);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        pointCount += 1;
        return `${fmt(x)},${fmt(y)}`;
      });
      // "M x,y x,y ..." — pasangan koordinat pertama setelah M adalah lineto implisit.
      parts.push(`M${coords.join(' ')}Z`);
    }
    if (parts.length) provinces.push({ name, d: parts.join('') });
  }

  provinces.sort((a, b) => a.name.localeCompare(b.name, 'id'));

  const header = `// AUTO-GENERATED oleh scripts/generate-indonesia-map.mjs — jangan diedit manual.
// Sumber: Natural Earth 50m admin-1 states/provinces (public domain),
//         difilter admin === 'Indonesia', diproyeksikan Web Mercator.
// Proyeksi: x = lng(rad)*SCALE, y = -mercY(lat)*SCALE (y ke bawah).

export interface ProvincePath {
  readonly name: string;
  readonly d: string;
}

/** Skala proyeksi: view units per radian. */
export const MAP_SCALE = ${SCALE};

/** Rentang geometri Indonesia dalam view units (tanpa padding). */
export const MAP_MIN_X = ${fmt(minX)};
export const MAP_MAX_X = ${fmt(maxX)};
export const MAP_MIN_Y = ${fmt(minY)};
export const MAP_MAX_Y = ${fmt(maxY)};

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const mercY = (lat: number): number => Math.log(Math.tan(Math.PI / 4 + toRad(lat) / 2));

/** Proyeksi Web Mercator (lng/lat derajat -> view units, y ke bawah). */
export function project(lng: number, lat: number): { x: number; y: number } {
  return { x: toRad(lng) * MAP_SCALE, y: -mercY(lat) * MAP_SCALE };
}

/** Titik tengah geometri Indonesia dalam view units. */
export const MAP_CENTER = {
  x: ${(minX + maxX) / 2},
  y: ${(minY + maxY) / 2},
};

export const PROVINCE_PATHS: readonly ProvincePath[] = [
`;

  const body = provinces
    .map((p) => `  { name: ${JSON.stringify(p.name)}, d: ${JSON.stringify(p.d)} },\n`)
    .join('');

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, header + body + '];\n', 'utf8');

  const size = (header + body + '];\n').length;
  console.log(`Selesai: ${provinces.length} provinsi, ${pointCount} titik, ${(size / 1024).toFixed(1)} KB -> ${OUTPUT}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
