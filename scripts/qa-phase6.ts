/**
 * QA Fase 6 — sandbox 2 akun Firebase (produksi bersamakita-app)
 *
 * Membuktikan:
 * 1. `GET /api/fundraising/summary` & `/report/:id` IDENTIK untuk guest, user A, user B
 *    (agregasi kolektif server-side — bukan data per-akun).
 * 2. Aturan `firestore.rules` hardening LIVE: user biasa BISA baca `disasterTimeline`,
 *    tapi DITOLAK menulis ke `disasterTimeline`, `earthquakeEvents`, `disasters`.
 *
 * User QA dibuat via Admin SDK lalu DIHAPUS di akhir (tidak meninggalkan jejak).
 * Jalankan: node --env-file=.env ./node_modules/tsx/dist/cli.mjs scripts/qa-phase6.ts
 */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const PROD = 'https://bersamakita.vercel.app';
const API_KEY = 'AIzaSyDIY2-sZQ65l4WNmWebAnxJOgOLqyE2yZk';
const FIREBASE_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
const FS_URL = 'https://firestore.googleapis.com/v1/projects/bersamakita-app/databases/(default)/documents';

const QA_USERS = [
  { email: 'qa.donor.a@bersamakita.test', password: 'QaTestPass!123456' },
  { email: 'qa.donor.b@bersamakita.test', password: 'QaTestPass!123456' },
];

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  if (!ok) failures += 1;
}
const stripGeneratedAt = (obj: any) => {
  const clone = JSON.parse(JSON.stringify(obj));
  delete clone?.data?.generatedAt;
  return clone;
};
function short(s: string, n = 400) {
  return s.length > n ? s.slice(0, n) + '...' : s;
}

async function main() {
  const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '');
  if (!cred.project_id) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON tidak tersedia.');
  if (getApps().length === 0) {
    initializeApp({ credential: cert(cred) });
  }
  const auth = getAuth();

  console.log(`Project (Admin SDK): ${cred.project_id}\n`);

  // --- 1. Buat 2 user QA ---
  const qaUids: string[] = [];
  for (const u of QA_USERS) {
    try {
      const rec = await auth.createUser({
        email: u.email,
        password: u.password,
        displayName: u.email.split('@')[0],
        emailVerified: true,
      });
      qaUids.push(rec.uid);
      console.log(`User QA dibuat: ${u.email} (${rec.uid})`);
    } catch (e: any) {
      // sudah ada (retry sebelumnya) → ambil uid-nya
      const rec = await auth.getUserByEmail(u.email);
      qaUids.push(rec.uid);
      console.log(`User QA sudah ada: ${u.email} (${rec.uid})`);
    }
  }

  try {
    // --- 2. Sign-in dua akun + guest token null ---
    const signIn = async (email: string, password: string) => {
      const res = await fetch(FIREBASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });
      if (!res.ok) throw new Error(`signIn ${email}: HTTP ${res.status} ${await res.text()}`);
      return (await res.json()).idToken as string;
    };
    const tokenA = await signIn(QA_USERS[0].email, QA_USERS[0].password);
    const tokenB = await signIn(QA_USERS[1].email, QA_USERS[1].password);
    check('ID token didapat untuk 2 akun QA', Boolean(tokenA) && Boolean(tokenB));

    const get = async (path: string, token?: string) => {
      const res = await fetch(`${PROD}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return { status: res.status, json: await res.json() };
    };

    // --- 3. Summary: guest vs A vs B IDENTIK (tanpa generatedAt) ---
    const sumGuest = await get('/api/fundraising/summary');
    const sumA = await get('/api/fundraising/summary', tokenA);
    const sumB = await get('/api/fundraising/summary', tokenB);
    check(
      'HTTP 200 /api/fundraising/summary untuk guest/A/B',
      sumGuest.status === 200 && sumA.status === 200 && sumB.status === 200,
      `guest=${sumGuest.status} A=${sumA.status} B=${sumB.status}`
    );
    const g1 = JSON.stringify(stripGeneratedAt(sumGuest.json));
    check(
      'summary IDENTIK untuk guest = user A = user B',
      g1 === JSON.stringify(stripGeneratedAt(sumA.json)) && g1 === JSON.stringify(stripGeneratedAt(sumB.json))
    );
    const d = sumGuest.json?.data || {};
    const disasters = (d.disasters || []).filter((x: any) => !x.disasterId.startsWith('__'));
    console.log(
      `  totals: collected=${d.totals?.collected} donationCount=${d.totals?.donationCount} inflight=${d.totals?.inflight} remaining=${d.totals?.remaining}`
    );
    console.log(
      `  bencana (${disasters.length}): ` +
        disasters
          .map((x: any) => `${x.disasterTitle.slice(0, 24)} → collected ${x.collected}`)
          .join(' | ')
    );

    // --- 4. Report per bencana: guest vs A vs B IDENTIK ---
    if (disasters.length > 0) {
      const did = disasters[0].disasterId;
      const repGuest = await get(`/api/fundraising/report/${did}`);
      const repA = await get(`/api/fundraising/report/${did}`, tokenA);
      const repB = await get(`/api/fundraising/report/${did}`, tokenB);
      const r1 = JSON.stringify(stripGeneratedAt(repGuest.json));
      check(
        'report IDENTIK untuk guest = user A = user B',
        repGuest.status === 200 && repA.status === 200 && repB.status === 200 && r1 === JSON.stringify(stripGeneratedAt(repA.json)) && r1 === JSON.stringify(stripGeneratedAt(repB.json)),
        `guest=${repGuest.status} A=${repA.status} B=${repB.status} · timeline ${short(JSON.stringify(repGuest.json?.data?.timeline || []))}`
      );
      console.log(
        `  summary report: collected=${repGuest.json?.data?.summary?.totalCollected} disbursed=${repGuest.json?.data?.summary?.disbursed} inflight=${repGuest.json?.data?.summary?.inflight} remaining=${repGuest.json?.data?.summary?.remaining}`
      );

      // --- 5. Rules live: user biasa baca timeline (harus 200) ---
      const tlGet = await fetch(`${FS_URL}/disasterTimeline/${did}/events?pageSize=5`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      check('user A BISA baca disasterTimeline', tlGet.status === 200, `HTTP ${tlGet.status}`);

      // --- 6. Rules live: user biasa TIDAK boleh menulis timeline / earthquakes / disasters ---
      const tlCreate = await fetch(`${FS_URL}/disasterTimeline/${did}/events?documentId=qa-${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          fields: {
            id: { stringValue: `qa-${Date.now()}` },
            disasterId: { stringValue: did },
            type: { stringValue: 'partner_update' },
            title: { stringValue: 'QA' },
            description: { stringValue: 'QA write attempt' },
            createdAt: { stringValue: new Date().toISOString() },
          },
        }),
      });
      check('user A DITOLAK menulis disasterTimeline', tlCreate.status === 403, `HTTP ${tlCreate.status}`);

      const eqCreate = await fetch(`${FS_URL}/earthquakeEvents?documentId=qa-${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ fields: { id: { stringValue: `qa-${Date.now()}` } } }),
      });
      check('user A DITOLAK menulis earthquakeEvents', eqCreate.status === 403, `HTTP ${eqCreate.status}`);

      const dPatch = await fetch(`${FS_URL}/disasters/${did}?updateMask.fieldPaths=title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ fields: { title: { stringValue: 'QA HACK TITLE' } } }),
      });
      check('user A DITOLAK mengubah disasters', dPatch.status === 403, `HTTP ${dPatch.status}`);
    } else {
      check('Tidak ada bencana aktif utk uji report/rules — dilewati', true, 'disasterTimeline juga tidak diuji');
    }
  } finally {
    // --- 7. Bersihkan user QA (tidak meninggalkan jejak) ---
    for (const uid of qaUids) {
      try {
        await auth.deleteUser(uid);
        console.log(`User QA dihapus: ${uid}`);
      } catch (e: any) {
        console.warn(`Gagal menghapus ${uid}: ${e.message}`);
      }
    }
  }

  console.log(`\n${failures === 0 ? '✅ QA SELESAI: SEMUA PASS' : `❌ QA SELESAI: ${failures} FAIL`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});