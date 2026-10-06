import { adminDb } from './src/config/firebase-admin.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const merchantCode = process.env.DUITKU_MERCHANT_CODE || '';
const apiKey = process.env.DUITKU_API_KEY || '';
const baseUrl = process.env.APP_URL || 'http://localhost:3005';

async function setupMockTransaction(donationId: string) {
  if (!adminDb) throw new Error('Admin DB not ready');
  const batch = adminDb.batch();
  
  const donationRef = adminDb.collection('donations').doc(donationId);
  batch.set(donationRef, {
    id: donationId,
    userId: 'test_user_123',
    amount: 50000,
    status: 'pending_payment',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const paymentRef = adminDb.collection('payments').doc(`pay-${donationId}`);
  batch.set(paymentRef, {
    id: `pay-${donationId}`,
    donationId: donationId,
    providerReference: `REF-${donationId}`,
    status: 'pending',
    amount: 50000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  await batch.commit();
  console.log(`Mock transaction ${donationId} created.`);
}

async function simulateCallback(donationId: string, resultCode: string, tamperedSignature?: string) {
  const amount = '50000';
  const reference = `REF-${donationId}`;
  const signatureRaw = merchantCode + amount + donationId + apiKey;
  const signature = tamperedSignature || crypto.createHash('md5').update(signatureRaw).digest('hex');

  const payload = {
    merchantCode,
    amount,
    merchantOrderId: donationId,
    signature,
    reference,
    resultCode
  };

  const res = await fetch(`${baseUrl}/api/payments/duitku/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log(`Callback Response for ${donationId} (Code: ${resultCode}):`, res.status, data);
}

async function verifyFirestore(donationId: string) {
  if (!adminDb) return;
  const doc = await adminDb.collection('donations').doc(donationId).get();
  console.log(`Donation ${donationId} status in DB:`, doc.data()?.status);
}

async function runTests() {
  console.log('--- STARTING CALLBACK TESTS ---');
  
  // Test 1: Valid Callback Success
  const id1 = `test-don-success-${Date.now()}`;
  await setupMockTransaction(id1);
  await simulateCallback(id1, '00');
  await verifyFirestore(id1);

  // Test 2: Idempotent (Duplicate Callback)
  console.log('\nTesting Idempotency...');
  await simulateCallback(id1, '00');

  // Test 3: Invalid Signature
  console.log('\nTesting Invalid Signature...');
  const id2 = `test-don-invalid-${Date.now()}`;
  await setupMockTransaction(id2);
  await simulateCallback(id2, '00', 'invalid_signature_hash');
  await verifyFirestore(id2);

  // Test 4: Unknown Reference
  console.log('\nTesting Unknown Reference...');
  const id3 = `unknown-don-${Date.now()}`;
  await simulateCallback(id3, '00');

  // Test 5: Failed Payment
  console.log('\nTesting Failed Payment...');
  const id4 = `test-don-fail-${Date.now()}`;
  await setupMockTransaction(id4);
  await simulateCallback(id4, '01');
  await verifyFirestore(id4);

  process.exit(0);
}

setTimeout(runTests, 2000); // give time for adminDb to init
