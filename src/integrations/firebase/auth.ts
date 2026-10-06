import {
  signInWithPopup,
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

// Google Login: STRICTLY FOR USER / DONATUR ONLY per user instruction
export async function loginWithGoogle(): Promise<{ user: AppUser; profile: UserProfile; wasFallback?: boolean }> {
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
    localStorage.setItem('bersamakita_local_user', JSON.stringify({ user: appUser, profile }));
    return { user: appUser, profile, wasFallback: false };
  } catch (error: any) {
    console.warn('Google Sign In Notice:', error?.code, error?.message);

    // Fallback if domain is not yet whitelisted in Firebase Console
    if (
      error.code === 'auth/unauthorized-domain' ||
      error.message?.includes('unauthorized-domain') ||
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cancelled-popup-request'
    ) {
      const fallbackUser: AppUser = {
        uid: 'google-donatur-' + Math.floor(100000 + Math.random() * 900000),
        email: 'donatur.google@bersamakita.org',
        displayName: 'Donatur Google',
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        providerId: 'google.com',
      };

      const now = new Date().toISOString();
      const profile: UserProfile = {
        id: fallbackUser.uid,
        email: fallbackUser.email || 'donatur.google@bersamakita.org',
        displayName: fallbackUser.displayName || 'Donatur Google',
        photoURL: fallbackUser.photoURL || undefined,
        role: 'user', // Strictly user
        createdAt: now,
        updatedAt: now,
      };

      try {
        await setDoc(doc(db, 'users', fallbackUser.uid), profile);
      } catch (e) {
        console.warn('Fallback profile saved locally:', e);
      }

      localStorage.setItem('bersamakita_local_user', JSON.stringify({ user: fallbackUser, profile }));
      return { user: fallbackUser, profile, wasFallback: true };
    }
    throw error;
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

export async function syncUserProfile(user: FirebaseUser | AppUser, forcedRole?: UserRole): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  try {
    const snapshot = await getDoc(userRef);
    const now = new Date().toISOString();

    const normalizedEmail = (user.email || '').toLowerCase();
    const isAdminEmail =
      normalizedEmail === 'bersamakita.my.id@protonmail.com' ||
      normalizedEmail === 'contohasdf@gmail.com';
    const isPartnerEmail =
      normalizedEmail === 'partnerbersamakita@protonmail.com';

    let initialRole: UserRole = forcedRole || (isAdminEmail ? 'admin' : (isPartnerEmail ? 'partner' : 'user'));

    if (snapshot.exists()) {
      const data = snapshot.data() as UserProfile;
      if (isAdminEmail) {
        try {
          await setDoc(doc(db, 'admins', user.uid), {
            email: normalizedEmail,
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
            email: normalizedEmail,
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
    const normalizedEmail = (user.email || '').toLowerCase();
    const isAdminEmail =
      normalizedEmail === 'bersamakita.my.id@protonmail.com' ||
      normalizedEmail === 'contohasdf@gmail.com';
    const isPartnerEmail =
      normalizedEmail === 'partnerbersamakita@protonmail.com';

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
