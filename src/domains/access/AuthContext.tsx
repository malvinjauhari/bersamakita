import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  loginWithGoogle,
  logout as authLogout,
  subscribeAuthState,
  syncUserProfile,
  AppUser,
} from '../../integrations/firebase/auth';
import { UserProfile, UserRole } from '../../types';
import { testConnection } from '../../config/firebase';
import { ensureInitialSeed } from '../../integrations/firebase/seed';

export interface StaffSession {
  email: string;
  role: 'admin' | 'partner';
  name: string;
  loginAt: string;
}

interface AuthContextType {
  // 1. User Session (Exclusively Google Login & Multi-User Verification)
  user: AppUser | null;
  profile: UserProfile | null;
  isGoogleAuthenticated: boolean;
  loginGoogle: () => Promise<boolean>;
  loginAsUser: (userParam: { uid: string; email: string; displayName: string; photoURL?: string }) => Promise<void>;
  logoutGoogle: () => Promise<void>;
  logout: () => Promise<void>; // Alias for user logout

  // 2. Staff Session (Admin & Partner — Completely Isolated)
  staffSession: StaffSession | null;
  isAdminAuthenticated: boolean;
  isPartnerAuthenticated: boolean;
  loginStaff: (email: string, pass: string) => Promise<{ role: 'admin' | 'partner' }>;
  logoutStaff: () => void;
  quickFillCredential: (type: 'admin' | 'partner') => { email: string; pass: string };

  // Common helpers
  role: UserRole;
  loading: boolean;
  switchRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GOOGLE_SESSION_KEY = 'bersamakita_google_user_session';
const STAFF_SESSION_KEY = 'bersamakita_staff_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. User Google Session State
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 2. Staff Admin/Partner Session State (Completely Isolated from Google Session)
  const [staffSession, setStaffSession] = useState<StaffSession | null>(() => {
    try {
      const saved = localStorage.getItem(STAFF_SESSION_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse cached staff session:', e);
    }
    return null;
  });

  useEffect(() => {
    testConnection();
    ensureInitialSeed();

    // Restore Google user session from cache if available
    const cachedGoogle = localStorage.getItem(GOOGLE_SESSION_KEY);
    if (cachedGoogle) {
      try {
        const parsed = JSON.parse(cachedGoogle);
        if (parsed.user && parsed.profile) {
          setUser(parsed.user);
          setProfile(parsed.profile);
        }
      } catch (e) {
        console.warn('Failed to parse cached google session:', e);
      }
    }

    // Subscribe ONLY to Firebase Google Auth state for User
    const unsubscribe = subscribeAuthState(async (fbUser) => {
      if (fbUser) {
        // Only accept if not an internal protonmail staff email in firebase auth
        const appUser: AppUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
        };
        setUser(appUser);
        try {
          const prof = await syncUserProfile(fbUser, 'user');
          setProfile(prof);
          localStorage.setItem(
            GOOGLE_SESSION_KEY,
            JSON.stringify({ user: appUser, profile: prof })
          );
        } catch (e) {
          console.error('Error syncing Google user profile:', e);
        }
      } else {
        const cached = localStorage.getItem(GOOGLE_SESSION_KEY);
        if (!cached) {
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // User Authentication via Google Only
  const loginGoogle = async (): Promise<boolean> => {
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      setUser(result.user);
      setProfile(result.profile);
      localStorage.setItem(
        GOOGLE_SESSION_KEY,
        JSON.stringify({ user: result.user, profile: result.profile })
      );
      return !!result.wasFallback;
    } finally {
      setLoading(false);
    }
  };

  const loginAsUser = async (userParam: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  }): Promise<void> => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const appUser: AppUser = {
        uid: userParam.uid,
        email: userParam.email,
        displayName: userParam.displayName,
        photoURL:
          userParam.photoURL ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        providerId: 'google.com',
      };
      const prof: UserProfile = {
        id: appUser.uid,
        email: appUser.email || '',
        displayName: appUser.displayName || 'Donatur',
        photoURL: appUser.photoURL || undefined,
        role: 'user',
        createdAt: now,
        updatedAt: now,
      };
      setUser(appUser);
      setProfile(prof);
      localStorage.setItem(GOOGLE_SESSION_KEY, JSON.stringify({ user: appUser, profile: prof }));
    } finally {
      setLoading(false);
    }
  };

  const logoutGoogle = async () => {
    setLoading(true);
    try {
      await authLogout();
      setUser(null);
      setProfile(null);
      localStorage.removeItem(GOOGLE_SESSION_KEY);
      localStorage.removeItem('bersamakita_local_user');
    } finally {
      setLoading(false);
    }
  };

  // Staff (Admin & Partner) Authentication — Completely separate from Google
  const loginStaff = async (email: string, pass: string): Promise<{ role: 'admin' | 'partner' }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    // Strict credential validation for designated staff accounts only (Master Admin)
    if (cleanEmail === 'bersamakita.my.id@protonmail.com' && cleanPass === 'bersamakita01') {
      try {
        const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
        const { auth, db } = await import('../../config/firebase');
        const { setDoc, doc } = await import('firebase/firestore');
        
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        } catch (authErr: any) {
          // If the user doesn't exist yet, we create it so the Admin has a valid token
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
            const uc = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
            await setDoc(doc(db, 'users', uc.user.uid), {
              id: uc.user.uid,
              email: cleanEmail,
              displayName: 'Administrator Operasional',
              role: 'admin',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          } else {
            console.warn('Firebase master admin auth error:', authErr);
          }
        }
      } catch (e) {
        console.warn('Could not initialize Firebase Auth for master admin:', e);
      }

      const session: StaffSession = {
        email: 'bersamakita.my.id@protonmail.com',
        role: 'admin',
        name: 'Administrator Operasional',
        loginAt: new Date().toISOString(),
      };
      setStaffSession(session);
      localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
      return { role: 'admin' };
    } 
    
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { auth, db } = await import('../../config/firebase');
      const { getDoc, doc } = await import('firebase/firestore');

      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists() || userDoc.data()?.role !== 'partner') {
        throw new Error('Akun bukan partner terdaftar.');
      }

      const session: StaffSession = {
        email: cleanEmail,
        role: 'partner',
        name: userDoc.data()?.displayName || 'Mitra Lapangan Terpadu',
        loginAt: new Date().toISOString(),
      };
      setStaffSession(session);
      localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
      return { role: 'partner' };
    } catch (err: any) {
      console.error('Staff login error:', err);
      throw new Error(
        'Kredensial tidak terdaftar. Akses hanya diizinkan untuk akun resmi staf Bersama Kita (Admin/Partner).'
      );
    }
  };

  const logoutStaff = () => {
    setStaffSession(null);
    localStorage.removeItem(STAFF_SESSION_KEY);
  };

  const quickFillCredential = (type: 'admin' | 'partner') => {
    if (type === 'admin') {
      return {
        email: 'bersamakita.my.id@protonmail.com',
        pass: 'bersamakita01',
      };
    } else {
      return {
        email: 'partnerbersamakita@protonmail.com',
        pass: 'bersamakita01',
      };
    }
  };

  const switchRole = async (newRole: UserRole) => {
    if (!user || !profile) return;
    const updated = await syncUserProfile(user, newRole);
    setProfile(updated);
    localStorage.setItem(GOOGLE_SESSION_KEY, JSON.stringify({ user, profile: updated }));
  };

  const isAdminAuthenticated = staffSession !== null && staffSession.role === 'admin';
  const isPartnerAuthenticated =
    staffSession !== null && (staffSession.role === 'partner' || staffSession.role === 'admin');
  const isGoogleAuthenticated = user !== null;

  // Effective role: prioritize staffSession if in staff area, otherwise profile role or 'user'
  const role: UserRole = staffSession ? staffSession.role : profile?.role || 'user';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isGoogleAuthenticated,
        loginGoogle,
        loginAsUser,
        logoutGoogle,
        logout: logoutGoogle,

        staffSession,
        isAdminAuthenticated,
        isPartnerAuthenticated,
        loginStaff,
        logoutStaff,
        quickFillCredential,

        role,
        loading,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
