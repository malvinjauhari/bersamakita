import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDIY2-sZQ65l4WNmWebAnxJOgOLqyE2yZk",
  authDomain: "bersamakita-app.firebaseapp.com",
  projectId: "bersamakita-app",
  storageBucket: "bersamakita-app.firebasestorage.app",
  messagingSenderId: "101620394048",
  appId: "1:101620394048:web:ddeccfeaf644c24b2d57a5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("Fetching disasters...");
  try {
    const q = query(collection(db, 'disasters'), limit(10));
    const snap = await getDocs(q);
    console.log("Success! Found", snap.docs.length, "disasters.");
  } catch (e) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}
run();
