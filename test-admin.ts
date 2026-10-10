import { adminDb } from './src/config/firebase-admin.js';

async function testConnection() {
  if (!adminDb) {
    console.error('❌ Firebase Admin initialization: FAILED');
    process.exit(1);
  }

  try {
    console.log('✅ Firebase Admin initialization: PASS');

    // TEST READ
    await adminDb.collection('test_admin_sdk').limit(1).get();
    console.log('✅ Firestore READ: PASS');

    // TEST WRITE
    const docRef = adminDb.collection('test_admin_sdk').doc('test_doc');
    await docRef.set({ test_field: 'hello_world', timestamp: new Date().toISOString() });
    console.log('✅ Firestore WRITE: PASS');

    // TEST DELETE
    await docRef.delete();
    console.log('✅ Firestore DELETE: PASS');

    process.exit(0);
  } catch (error: any) {
    if (error.message.includes('Could not load the default credentials') || error.message.includes('Project Id')) {
      console.error('\n⚠️ VERIFICATION CANNOT BE COMPLETED');
      console.error('Credential Service Account belum tersedia di environment variable.');
      console.error('Silakan isi FIREBASE_SERVICE_ACCOUNT_JSON di file .env.');
    } else {
      console.error('Error connecting to Firestore via Admin SDK:', error.message);
    }
    process.exit(1);
  }
}

testConnection();
