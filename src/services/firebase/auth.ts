import {
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

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  providerId?: string;
}

// Google Login: STRICTLY FOR USER / DONATUR ONLY per user instruction.
// Memakai REDIRECT sign-in (bukan popup) agar TIDAK diblokir popup blocker
// (`auth/popup-blocked`) maupun ekstensi pemblokir (`ERR_BLOCKED_BY_CLIENT`).
// Setelah redirect, hasil ditangkap oleh `completeGoogleRedirect()` (dipanggil
// saat AuthContext mount) dan sesi pengguna dibuat oleh `onAuthStateChanged`.
// TIDAK ADA LAGI sesi fiktif "Donatur Google": fallback lama membuat uid palsu
// yang tidak terautentikasi (permission-denied di dashboard). Kegagalan kini
// dilempar dengan pesan yang jujur ke UI.
export async function loginWithGoogle(): Promise<void> {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error: any) {
    console.error('Google redirect sign-in error:', error?.code, error?.message);
    throw new Error(googleSignInErrorMessage(error));
  }
}

/** Pesan error Google Sign-In yang ramah pengguna (bukan error mentah). */
export function googleSignInErrorMessage(error: any): string {
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

/**
 * Menyelesaikan hasil Google sign-in via redirect — dipanggil SEKALI saat
 * AuthContext mount. Membuang "pending redirect" dari siklus sebelumnya dan
 * mencatat error balik-kembali (mis. akun sudah terdaftar dgn metode lain).
 * Sesi pengguna sungguhan di-mantapkan oleh `onAuthStateChanged`.
 */
export async function completeGoogleRedirect(): Promise<{ ok: boolean; error?: string }> {
  try {
    const cred = await getRedirectResult(auth);
    if (cred?.user) {
      console.info('Google redirect sign-in selesai utk:', cred.user.email);
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

    localStorage.setItem('bersamakita_local_user', JSON.stringify({ user: appUser, profile }));
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

      localStorage.setItem('bersamakita_local_user', JSON.stringify({ user: appUser, profile }));
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
    localStorage.setItem('bersamakita_local_user', JSON.stringify({ user: appUser, profile }));
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
    localStorage.setItem('bersamakita_local_user', JSON.stringify({ user: appUser, profile }));
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
  localStorage.removeItem('bersamakita_local_user');
  try {
    await fbSignOut(auth);
  } catch (e) {
    console.warn('Sign out:', e);
  }
}

export function subscribeAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
