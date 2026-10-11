/**
 * safe-storage — akses Web Storage (localStorage/sessionStorage) yang TIDAK
 * PERNAH melempar error ke pemanggil.
 *
 * Konteks: di browser dengan pemblokir agresif (adblock/privacy), tab
 * preview/iframe sandbox, atau pengaturan "block third-party cookies/site
 * data", akses `localStorage`/`sessionStorage` melempar secara sinkron —
 * di Chrome/Safari pesannya dapat berupa
 * "Access to storage is not allowed from this context." Bila tidak
 * ditangkap, error ini muncul sebagai `Uncaught (in promise)` di level
 * dokumen (mis. `login?redirect=/dashboard:1`) dan — yang lebih parah —
 * Firebase Auth redirect sign-in TIDAK BISA memulihkan sesi (hasil redirect
 * wajib dibaca dari storage setelah navigasi penuh), sehingga user "berhasil
 * login di Google" tetapi stuck di halaman login.
 *
 * Aturan pakai: SELURUH akses localStorage/sessionStorage di src/ WAJIB
 * lewat helper ini, bukan `localStorage.*` langsung.
 */

export function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // abaikan — storage tidak tersedia di konteks ini
  }
}

/** Probe apakah Web Storage benar-benar bisa dipakai di konteks ini. */
export function isWebStorageAvailable(): { ok: boolean; detail: string } {
  try {
    const probe = '__bk_storage_probe__';
    window.localStorage.setItem(probe, '1');
    const readBack = window.localStorage.getItem(probe);
    window.localStorage.removeItem(probe);
    if (readBack !== '1') {
      return { ok: false, detail: 'localStorage tulis/baca tidak konsisten' };
    }
  } catch (e: any) {
    return { ok: false, detail: e?.message || String(e) || 'localStorage diblokir' };
  }
  try {
    const probe = '__bk_session_probe__';
    window.sessionStorage.setItem(probe, '1');
    window.sessionStorage.removeItem(probe);
  } catch (e: any) {
    return { ok: false, detail: 'sessionStorage diblokir: ' + (e?.message || String(e)) };
  }
  return { ok: true, detail: 'ok' };
}

/**
 * Deteksi apakah sebuah error berasal dari pemblokiran storage —
 * mencakup pesan browser ("Access to storage is not allowed from this
 * context"), kode Firebase Auth (`auth/web-storage-unsupported`), dan
 * varian SecurityError/penolakan akses generik.
 */
export function isStorageBlockedError(error: any): boolean {
  const code: string = error?.code || '';
  const name: string = error?.name || '';
  const msg: string = (error?.message || '') + ' ' + String(error || '');
  const hay = `${code} ${name} ${msg}`.toLowerCase();
  return (
    code === 'auth/web-storage-unsupported' ||
    code === 'auth/operation-not-supported-in-this-environment' ||
    hay.includes('access to storage is not allowed') ||
    hay.includes('web-storage-unsupported') ||
    (name === 'SecurityError' &&
      (hay.includes('storage') ||
        hay.includes('access is denied') ||
        hay.includes('insecure') ||
        hay.includes('blocked') ||
        hay.includes('denied')))
  );
}

/** Pesan pandu yang actionable saat storage diblokir (dipakai UI login). */
export const STORAGE_BLOCKED_MESSAGE =
  'Browser memblokir penyimpanan situs ini sehingga sesi login tidak bisa disimpan. ' +
  'Izinkan "cookies & site data" untuk situs ini / nonaktifkan pemblokir (adblock/privacy) untuk domain ini, ' +
  'lalu buka di tab browser penuh (bukan panel preview/iframe) dan coba masuk lagi.';
