import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../config/firebase';
import { UserProfile, UserRole } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { safeSet, safeRemove, isStorageBlockedError, STORAGE_BLOCKED_MESSAGE } from '../../lib/safe-storage';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  providerId?: string;
}

// Google Login: STRICTLY FOR USER / DONATUR ONLY per user instruction.
// HYBRID popup-first: popup utama (UX mulus, seperti semula). Bila popup
// DIBLOKIR browser (`auth/popup-blocked` — setting per-situs, in-app
// browser, atau pemblokir), OTOMATIS fallback ke `signInWithRedirect`
// (halaman pindah ke Google lalu kembali; hasilnya ditangkap
// `completeGoogleRedirect()` saat mount). Fallback ini yang membuat login
// tetap bisa di domain Vercel tanpa user harus mengubah setting pop-up.
// TIDAK ADA sesi fiktif "Donatur Google": kegagalan lain dilempar jujur ke UI.
export async function loginWithGoogle(): Promise<{ user: AppUser; profile: UserProfile }> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const fbUser = cred.user;
    // Do not force 'user' role so that Google Admin (contohasdf@gmail.com) gets their proper admin role
    const profile = await syncUserProfile(fbUser);
    const appUser: AppUser = {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      photoURL: fbUser.photoURL,
      providerId: 'google.com',
    };
    safeSet('bersamakita_local_user', JSON.stringify({ user: appUser, profile }));
    return { user: appUser, profile };
  } catch (error: any) {
    // Popup diblokir → fallback otomatis ke redirect (halaman pindah ke
    // Google). Promise ini tidak resolve normal karena browser navigasi;
    // sesi terbentuk via completeGoogleRedirect() + onAuthStateChanged.
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      console.warn('Popup Google diblokir, fallback otomatis ke redirect:', error?.code);
      try {
        await signInWithRedirect(auth, googleProvider);
        // Navigasi dimulai — eksekusi berhenti di sini (halaman unload).
        // Return di bawah hanya utk menenangkan type-checker.
        return new Promise(() => {});
      } catch (redirErr: any) {
        console.warn('Google redirect fallback error:', redirErr?.code, redirErr?.message);
        throw new Error(googleSignInErrorMessage(redirErr));
      }
    }
    console.warn('Google Sign In Notice:', error?.code, error?.message);
    throw new Error(googleSignInErrorMessage(error));
  }
}

/**
 * Menyelesaikan hasil Google sign-in via redirect (dipakai saat fallback
 * popup→redirect aktif) — dipanggil SEKALI saat AuthContext mount.
 * PENTING: `getRedirectResult` hanya bisa dikonsumsi SEKALI, jadi user yang
 * didapat dikembalikan langsung ke pemanggil untuk eager-sync (jangan panggil
 * `getRedirectResult` dua kali — panggilan kedua selalu null).
 */
export async function completeGoogleRedirect(): Promise<{ ok: boolean; error?: string; fbUser?: FirebaseUser }> {
  try {
    const cred = await getRedirectResult(auth);
    if (cred?.user) {
      console.info('Google redirect sign-in selesai utk:', cred.user.email);
      return { ok: true, fbUser: cred.user };
    }
    return { ok: true };
  } catch (error: any) {
    if (error?.code === 'auth/cancelled-popup-request' || error?.code === 'auth/popup-closed-by-user') {
      return { ok: true }; // pengguna membatalkan di halaman Google — bukan error
    }
    console.warn('Google redirect result error:', error?.code, error?.message);
    return { ok: false, error: googleSignInErrorMessage(error) };
  }
}

/** Pesan error Google Sign-In yang ramah pengguna (bukan error mentah). */
export function googleSignInErrorMessage(error: any): string {
  if (isStorageBlockedError(error)) {
    return STORAGE_BLOCKED_MESSAGE;
  }
  const code = error?.code || '';
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Domain situs ini belum terdaftar untuk Google Sign-In. Hubungi admin Bersama Kita.';
    case 'auth/popup-blocked':
      return 'Pop-up Google diblokir browser. Izinkan pop-up untuk situs ini, lalu coba lagi.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Login Google dibatalkan.';
    case 'auth/operation-not-supported-in-this-environment':
      return 'Google Sign-In tidak didukung di lingkungan ini (kemungkinan dibuka di panel preview/iframe). Buka di jendela browser penuh.';
    case 'auth/account-exists-with-different-credential':
      return 'Email ini sudah terdaftar dengan metode masuk lain.';
    case 'auth/network-request-failed':
      return 'Koneksi jaringan bermasalah. Periksa internet lalu coba lagi.';
    default:
      return code ? `Google Sign-In gagal (${code}). Silakan coba lagi.` : 'Google Sign-In gagal. Silakan coba lagi.';
  }
}

// Email Login: Required for Admin and Partner
export async function loginWithEmail(email: string, pass: string): Promise<{ user: AppUser; profile: UserProfile }> {
  const normalizedEmail = email.trim().toLowerCase();

  // Determine role based on clarified credentials
  let assignedRole: UserRole = 'user';
  let defaultDisplayName = 'Pengguna';

  if (normalizedEmail === 'bersamakita.my.id@protonmail.com' || normalizedEmail.includes('admin')) {
    assignedRole = 'admin';
    defaultDisplayName = 'Admin Bersama Kita';
  } else if (normalizedEmail === 'partnerbersamakita@protonmail.com' || normalizedEmail.includes('partner')) {
    assignedRole = 'partner';
    defaultDisplayName = 'Mitra Bersama Kita (PMI/BAZNAS)';
  }

  try {
    let fbUser: FirebaseUser;
    try {
      const cred = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
      fbUser = cred.user;
    } catch (authErr: any) {
      // If user not registered yet, auto-register the requested admin or partner credential
      if (
        authErr.code === 'auth/user-not-found' ||
        authErr.code === 'auth/invalid-credential'
      ) {
        const newCred = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
        fbUser = newCred.user;
      } else {
        throw authErr;
      }
    }

    const profile = await syncUserProfile(fbUser, assignedRole);
    const appUser: AppUser = {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: profile.displayName || defaultDisplayName,
      photoURL: fbUser.photoURL,
      providerId: 'password',
    };

    safeSet('bersamakita_local_user', JSON.stringify({ user: appUser, profile }));
    return { user: appUser, profile };
  } catch (error: any) {
    console.warn('Firebase email auth notice:', error.code, error.message);

    // If Firebase email auth fails (e.g. invalid credential or network restrictions),
    // and credentials match the designated Admin or Partner credentials:
    if (
      (normalizedEmail === 'bersamakita.my.id@protonmail.com' && pass === 'bersamakita01') ||
      (normalizedEmail === 'partnerbersamakita@protonmail.com' && pass === 'bersamakita01')
    ) {
      const localUid = normalizedEmail === 'bersamakita.my.id@protonmail.com' ? 'admin-bersamakita' : 'partner-bersamakita';
      const now = new Date().toISOString();
      const profile: UserProfile = {
        id: localUid,
        email: normalizedEmail,
        displayName: defaultDisplayName,
        role: assignedRole,
        createdAt: now,
        updatedAt: now,
      };

      const appUser: AppUser = {
        uid: localUid,
        email: normalizedEmail,
        displayName: defaultDisplayName,
        providerId: 'password',
      };

      try {
        await setDoc(doc(db, 'users', localUid), profile);
      } catch (e) {
        console.warn('Local session created:', e);
      }

      safeSet('bersamakita_local_user', JSON.stringify({ user: appUser, profile }));
      return { user: appUser, profile };
    }

    throw error;
  }
}

export async function registerWithEmail(
  email: string,
  pass: string,
  role: UserRole = 'user',
  name?: string
): Promise<{ user: AppUser; profile: UserProfile }> {
  const normalizedEmail = email.trim().toLowerCase();
  let assignedRole: UserRole = role;

  if (normalizedEmail === 'bersamakita.my.id@protonmail.com') {
    assignedRole = 'admin';
  } else if (normalizedEmail === 'partnerbersamakita@protonmail.com') {
    assignedRole = 'partner';
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
    const fbUser = cred.user;
    const profile: UserProfile = {
      id: fbUser.uid,
      email: fbUser.email || normalizedEmail,
      displayName: name || normalizedEmail.split('@')[0] || 'Pengguna',
      role: assignedRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', fbUser.uid), profile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
    }

    const appUser: AppUser = {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: profile.displayName,
      providerId: 'password',
    };
    safeSet('bersamakita_local_user', JSON.stringify({ user: appUser, profile }));
    return { user: appUser, profile };
  } catch (error: any) {
    const localUid = 'usr-' + Math.floor(100000 + Math.random() * 900000);
    const profile: UserProfile = {
      id: localUid,
      email: normalizedEmail,
      displayName: name || normalizedEmail.split('@')[0] || 'Pengguna',
      role: assignedRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', localUid), profile);
    } catch {
      // ignore
    }

    const appUser: AppUser = {
      uid: localUid,
      email: normalizedEmail,
      displayName: profile.displayName,
      providerId: 'password',
    };
    safeSet('bersamakita_local_user', JSON.stringify({ user: appUser, profile }));
    return { user: appUser, profile };
  }
}

/**
 * Role staf berdasarkan email — SATU sumber kebenaran, selaras dengan
 * `isAdmin()`/`isPartner()` di `firestore.rules` (3 email admin + 1 partner).
 * Dipakai oleh syncUserProfile & AuthContext agar role `users.*` untuk akun
 * staf tidak tertimpa menjadi 'user'.
 */
export function staffRoleForEmail(email?: string | null): 'admin' | 'partner' | 'user' {
  const normalized = (email || '').toLowerCase();
  if (
    normalized === 'bersamakita.my.id@protonmail.com' ||
    normalized === 'admin_backend@bersamakita.org' ||
    normalized === 'contohasdf@gmail.com'
  ) {
    return 'admin';
  }
  if (normalized === 'partnerbersamakita@protonmail.com') {
    return 'partner';
  }
  return 'user';
}

export async function syncUserProfile(user: FirebaseUser | AppUser, forcedRole?: UserRole): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  try {
    const snapshot = await getDoc(userRef);
    const now = new Date().toISOString();

    const staffRole = staffRoleForEmail(user.email);
    const isAdminEmail = staffRole === 'admin';
    const isPartnerEmail = staffRole === 'partner';

    let initialRole: UserRole = forcedRole || staffRole;

    if (snapshot.exists()) {
      const data = snapshot.data() as UserProfile;
      if (isAdminEmail) {
        try {
          await setDoc(doc(db, 'admins', user.uid), {
            email: (user.email || '').toLowerCase(),
            role: 'admin',
            createdAt: now,
          }, { merge: true });
        } catch (e) {
          console.warn('Set admin doc notice:', e);
        }
      }
      if (forcedRole && data.role !== forcedRole) {
        const updated = { ...data, role: forcedRole, updatedAt: now };
        await setDoc(userRef, updated, { merge: true });
        return updated;
      }
      return data;
    } else {
      const newProfile: UserProfile = {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Donatur',
        photoURL: user.photoURL || undefined,
        role: initialRole,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(userRef, newProfile);
      if (isAdminEmail) {
        try {
          await setDoc(doc(db, 'admins', user.uid), {
            email: (user.email || '').toLowerCase(),
            role: 'admin',
            createdAt: now,
          }, { merge: true });
        } catch (e) {
          console.warn('Set admin doc notice:', e);
        }
      }
      return newProfile;
    }
  } catch (error) {
    console.warn('Sync user   profile fallback without blocking:', error);
    const staffRole = staffRoleForEmail(user.email);
    const isAdminEmail = staffRole === 'admin';
    const isPartnerEmail = staffRole === 'partner';

    return {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Pengguna',
      role: forcedRole || (isAdminEmail ? 'admin' : isPartnerEmail ? 'partner' : 'user'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function logout(): Promise<void> {
  safeRemove('bersamakita_local_user');
  try {
    await fbSignOut(auth);
  } catch (e) {
    console.warn('Sign out:', e);
  }
}

export function subscribeAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
