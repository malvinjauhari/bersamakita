import { getDocs, collection, setDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { Partner } from '../../types';
import { fetchAutogempa } from '../bmkg';
import { saveBMKGDisaster } from './firestore';

export async function ensureInitialSeed(): Promise<void> {
  // Only attempt seeding when authenticated
  if (!auth.currentUser) {
    return;
  }
  try {
    // 1. Seed partners if empty
    const partnersSnap = await getDocs(collection(db, 'partners'));
    if (partnersSnap.empty) {
      const initialPartners: Partner[] = [
        {
          id: 'partner-pmi',
          name: 'Palang Merah Indonesia (PMI)',
          organization: 'PMI Tanggap Darurat Bencana',
          contact: '+62 21 7992325 / relawan@pmi.or.id',
          operationalArea: 'Nasional / Jawa Barat & Seluruh Wilayah Bencana',
          status: 'active',
          verifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'partner-baznas',
          name: 'BAZNAS Tanggap Bencana',
          organization: 'Badan Amil Zakat Nasional (BTB)',
          contact: '+62 21 27878789 / btb@baznas.go.id',
          operationalArea: 'Nasional / Distribusi Logistik dan Dapur Umum',
          status: 'active',
          verifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      for (const partner of initialPartners) {
        await setDoc(doc(db, 'partners', partner.id), partner, { merge: true });
      }
    }

    // 2. Seed initial disaster from BMKG if disasters collection is empty
    const disastersSnap = await getDocs(collection(db, 'disasters'));
    if (disastersSnap.empty) {
      const autoGempa = await fetchAutogempa();
      if (autoGempa) {
        autoGempa.disaster.status = 'pending_verification';
        autoGempa.disaster.verificationMethod = 'pending';
        await saveBMKGDisaster(autoGempa.event, autoGempa.disaster);
      }
      
      const { fetchGempaterkini } = await import('../bmkg');
      const recentList = await fetchGempaterkini();
      for (const item of recentList) {
        item.disaster.status = 'pending_verification';
        item.disaster.verificationMethod = 'pending';
        await saveBMKGDisaster(item.event, item.disaster);
      }
    }
  } catch (err) {
    console.warn('ensureInitialSeed notice (insufficient permissions or offline):', err);
  }
}
