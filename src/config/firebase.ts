import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyDIY2-sZQ65l4WNmWebAnxJOgOLqyE2yZk",
  authDomain: "bersamakita-app.firebaseapp.com",
  projectId: "bersamakita-app",
  storageBucket: "bersamakita-app.firebasestorage.app",
  messagingSenderId: "101620394048",
  appId: "1:101620394048:web:ddeccfeaf644c24b2d57a5"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Test Firestore connection on startup
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.info("Firestore connected successfully to project bersamakita-app");
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Harap periksa koneksi atau konfigurasi Firebase.");
    }
    return false;
  }
}
