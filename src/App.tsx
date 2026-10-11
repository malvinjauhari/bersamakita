import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { ToastProvider, useToast } from './components/feedback/Toast';
import { auth } from './config/firebase';
import { MinimalistLanding } from './components/landing/MinimalistLanding';
import { WideNavbar } from './components/layout/WideNavbar';
import { WideDisasterDashboard } from './features/disaster/WideDisasterDashboard';
import { WideFooter } from './components/layout/WideFooter';
import { UserLoginPage } from './features/auth/UserLoginPage';
import { MyDonationsPage } from './features/donation/MyDonationsPage';
import { SituationAnalysisPage } from './features/disaster/SituationAnalysisPage';
import { TransparansiReportsPage } from './features/distribution/TransparansiReportsPage';
import { KatalogBMKGPage } from './features/disaster/KatalogBMKGPage';
import { TransactionUniversalDispatcher } from './features/donation/TransactionUniversalDispatcher';
import { TransactionDonatePage } from './features/donation/TransactionDonatePage';
import { TransactionCheckoutPage } from './features/donation/TransactionCheckoutPage';
import { TransactionStatusPage } from './features/donation/TransactionStatusPage';
import { TransactionHistoryPage } from './features/donation/TransactionHistoryPage';
import { AdminAuthPage } from './features/admin/AdminAuthPage';
import { AdminPortalView } from './features/admin/AdminPortalView';
import { PartnerAuthPage } from './features/partner/PartnerAuthPage';
import { PartnerDashboardView } from './features/partner/PartnerDashboardView';
import { CardSkeleton } from './components/feedback/Skeleton';
import { HackathonBanner } from './components/layout/HackathonBanner';
import { FaqPage } from './features/public/FaqPage';
import { RefundPolicyPage } from './features/public/RefundPolicyPage';
import { TermsPage } from './features/public/TermsPage';
import { ContactPage } from './features/public/ContactPage';
import {
  getDisasters,
  getUserDonations,
  getAllDonations,
  getDisbursements,
  getPartners,
  getPartnerAllocations,
  getDistributionReports,
  getAuditLogs,
} from './services/firebase/firestore';
import {
  Disaster,
  Donation,
  Disbursement,
  Partner,
  PartnerAllocation,
  DistributionReport,
  AuditLog,
} from './types';

// Ingest BMKG SELALU lewat server (`POST /api/bmkg/refresh`, Admin SDK).
// Klien TIDAK pernah menulis langsung ke `earthquakeEvents`/`disasters`,
// sesuai hardening `firestore.rules` (Fase 5) — mencegah error
// "Missing or insufficient permissions" & akses tulis yang tidak sah.
async function refreshBMKGServer(): Promise<number> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Login diperlukan untuk memperbarui data BMKG.');
  const res = await fetch('/api/bmkg/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await res.json();
  if (!json?.success) throw new Error(json?.message || 'Gagal memperbarui data BMKG.');
  return json?.data?.ingested ?? 0;
}

// User Dashboard View Wrapper
function UserDashboardPage({
  disasters,
  reports,
  partners,
  dataLoading,
  onRefreshBMKG,
}: {
  disasters: Disaster[];
  reports: DistributionReport[];
  partners: Partner[];
  dataLoading: boolean;
  onRefreshBMKG: () => Promise<void>;
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 selection:bg-[#0C8F63] selection:text-white">
      <WideNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {dataLoading ? (
          <div className="space-y-6">
            <div className="h-28 bg-slate-200/70 rounded-3xl animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <CardSkeleton />
                <CardSkeleton />
              </div>
              <div className="lg:col-span-5 h-[600px] bg-slate-200/70 rounded-3xl animate-pulse" />
            </div>
          </div>
        ) : (
          <WideDisasterDashboard
            disasters={disasters}
            reports={reports}
            partners={partners}
            onDonateDisaster={(disasterId) => {
              navigate(`/transaction/${disasterId}`);
            }}
            onAnalyzeDisaster={(disasterId) => {
              navigate(`/dashboard/analysis/${disasterId}`);
            }}
            onRefreshBMKG={onRefreshBMKG}
            onOpenDonationsTab={() => navigate('/my-donation')}
          />
        )}
      </main>

      <WideFooter />
    </div>
  );
}

function MainRoutes() {
  const {
    user,
    staffSession,
    isAdminAuthenticated,
    isPartnerAuthenticated,
    loading: authLoading,
  } = useAuth();
  const { showToast } = useToast();

  // Core Data States
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [allocations, setAllocations] = useState<PartnerAllocation[]>([]);
  const [reports, setReports] = useState<DistributionReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  // Load data strictly according to Role & Permissions
  const loadData = async () => {
    try {
      // 1. Bootstrap kolam BMKG (Admin only). Ingest dilakukan SERVER
      //    (`POST /api/bmkg/refresh` via Admin SDK) — klien TIDAK menulis
      //    `disasters`/`earthquakeEvents` langsung. Ini mencegah error
      //    "Missing or insufficient permissions" ketika session staff stale
      //    memakai token akun Google biasa.
      if (isAdminAuthenticated) {
        try {
          await refreshBMKGServer();
        } catch (seedErr) {
          console.warn('Initial BMKG pool check notice:', seedErr);
        }
      }

      // 2. Query Disasters: 'all' for admin (showing pending), 'published' for users (approved only)
      try {
        const filter = isAdminAuthenticated ? 'all' : 'published';
        let disasterList = await getDisasters(filter);
        


        setDisasters(disasterList);
      } catch (err) {
        console.warn('Disasters fetch error:', err);
        setDisasters([]);
      }

      // 3. Fetch Partners
      try {
        const partnerList = await getPartners();
        setPartners(partnerList);
      } catch (err) {
        console.warn('Partners fetch error:', err);
      }

      // 4. Fetch Distribution Reports
      try {
        const repList = await getDistributionReports();
        setReports(repList);
      } catch (err) {
        console.warn('Reports fetch error:', err);
      }

      // 5. Staff-Restricted Queries (Admin)
      if (isAdminAuthenticated) {
        try {
          const disbList = await getDisbursements();
          setDisbursements(disbList);
        } catch (e) {
          console.warn('Disbursements admin fetch:', e);
        }

        try {
          const allocList = await getPartnerAllocations();
          setAllocations(allocList);
        } catch (e) {
          console.warn('Allocations admin fetch:', e);
        }

        try {
          const logList = await getAuditLogs();
          setAuditLogs(logList);
        } catch (e) {
          console.warn('Audit logs admin fetch:', e);
        }

        try {
          const allDonations = await getAllDonations();
          setDonations(allDonations);
        } catch (e) {
          console.warn('All donations admin fetch:', e);
        }
      } else if (isPartnerAuthenticated) {
        try {
          const allocList = await getPartnerAllocations();
          setAllocations(allocList);
        } catch (e) {
          console.warn('Partner allocations fetch:', e);
        }

        try {
          const allDonations = await getAllDonations();
          setDonations(allDonations);
        } catch (e) {
          console.warn('Partner all donations fetch:', e);
        }
      }

      // 6. User-Restricted Queries (Google User Session Only: User A sees User A, User B sees User B)
      if (!isAdminAuthenticated && !isPartnerAuthenticated) {
        if (user) {
          try {
            const userDonations = await getUserDonations(user.uid, user.email || undefined);
            setDonations(userDonations);
          } catch (e) {
            console.warn('User donations fetch:', e);
            setDonations([]);
          }

          // partnerAllocations are readable by any authenticated user
          // (firestore.rules) — fetch them so the transparency page shows the
          // same monitoring data for regular users as for staff.
          try {
            const allocList = await getPartnerAllocations();
            setAllocations(allocList);
          } catch (e) {
            console.warn('User allocations fetch:', e);
          }
        } else {
          // Unauthenticated guests see 0 donations. When user logs in, their distinct records are fetched.
          setDonations([]);
        }
      }
    } catch (err) {
      console.error('Error loading core data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, staffSession, isAdminAuthenticated, isPartnerAuthenticated]);

  const handleUserRefreshBMKG = async () => {
    try {
      // Ingest dilakukan SERVER (`POST /api/bmkg/refresh`) — klien tidak lagi
      // menulis langsung ke earthquakeEvents/disasters (hardening rules).
      await refreshBMKGServer();

      // Re-query only approved disasters for user
      const published = await getDisasters('published');
      setDisasters(published);

      if (published.length > 0) {
        showToast('Data bencana terverifikasi berhasil dimutakhirkan', 'success');
      } else {
        showToast('Data BMKG diterima ke antrean posko (Status: Menunggu Verifikasi Admin)', 'info');
      }
    } catch (e) {
      console.warn('User Refresh BMKG notice:', e);
      showToast('Koneksi data seismik diperiksa', 'info');
    }
  };

  const handleAdminRefreshBMKG = async () => {
    try {
      // Ingest via SERVER — admin tidak lagi menulis disaster/earthquake
      // langsung dari browser (selaras dengan hardening rules Fase 5).
      await refreshBMKGServer();
      showToast('Data BMKG berhasil ditarik ke antrean verifikasi admin', 'success');
      await loadData();
    } catch (e) {
      console.warn('Admin Refresh BMKG notice:', e);
      showToast('Data BMKG telah diperiksa', 'info');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9F8] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#1B3322] border-t-[#0C8F63] rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Memuat Bersama Kita...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* 1. Landing Page (Default Root Route per Request 1) */}
      <Route path="/" element={<MinimalistLanding />} />

      {/* 2. User Authentication Route */}
      <Route path="/auth/login" element={<UserLoginPage />} />

      {/* 3. User Dashboard & Feature Subroutes */}
      <Route
        path="/dashboard"
        element={
          <UserDashboardPage
            disasters={disasters}
            reports={reports}
            partners={partners}
            dataLoading={dataLoading}
            onRefreshBMKG={handleUserRefreshBMKG}
          />
        }
      />
      <Route
        path="/dashboard/analysis"
        element={<SituationAnalysisPage disasters={disasters} />}
      />
      <Route
        path="/dashboard/analysis/:disasterId"
        element={<SituationAnalysisPage disasters={disasters} />}
      />
      <Route
        path="/dashboard/ai-analysis"
        element={<Navigate to="/dashboard/analysis" replace />}
      />
      <Route
        path="/dashboard/ai-analysis/:disasterId"
        element={<SituationAnalysisPage disasters={disasters} />}
      />
      <Route
        path="/dashboard/reports"
        element={<TransparansiReportsPage reports={reports} allocations={allocations} />}
      />
      <Route
        path="/dashboard/katalog"
        element={
          <KatalogBMKGPage
            disasters={disasters}
            partners={partners}
            onRefreshBMKG={handleUserRefreshBMKG}
          />
        }
      />
      <Route
        path="/dashboard/donation"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route
        path="/dashboard/donation/:disasterId"
        element={
          <TransactionDonatePage
            disasters={disasters}
            onDataChanged={loadData}
          />
        }
      />
      <Route path="/bencana" element={<Navigate to="/dashboard" replace />} />
      <Route path="/katalog" element={<Navigate to="/dashboard/katalog" replace />} />

      {/* 4. Donasi Saya & Pelacakan Route */}
      <Route
        path="/my-donation"
        element={<MyDonationsPage donations={donations} />}
      />
      <Route
        path="/tracking"
        element={<MyDonationsPage donations={donations} />}
      />
      <Route
        path="/tracking/:donationId"
        element={<MyDonationsPage donations={donations} />}
      />
      <Route
        path="/lacak"
        element={<MyDonationsPage donations={donations} />}
      />
      <Route
        path="/lacak/:donationId"
        element={<MyDonationsPage donations={donations} />}
      />
      <Route
        path="/cek-transaksi"
        element={<TransactionHistoryPage donations={donations} />}
      />

      {/* 5. Transaction Donation Flow Routes (No Popups!) */}
      <Route
        path="/transaction/:id"
        element={
          <TransactionUniversalDispatcher
            disasters={disasters}
            donations={donations}
            onDataChanged={loadData}
          />
        }
      />
      <Route
        path="/transaction/donate/:disasterId"
        element={
          <TransactionDonatePage
            disasters={disasters}
            onDataChanged={loadData}
          />
        }
      />
      <Route
        path="/transaction/checkout/:donationId"
        element={<TransactionCheckoutPage onDataChanged={loadData} />}
      />
      <Route
        path="/transaction/status/:donationId"
        element={<TransactionStatusPage />}
      />

      {/* 6. Admin Authentication & Dashboard Routes */}
      <Route path="/admin/auth" element={<AdminAuthPage />} />
      <Route
        path="/admin"
        element={
          isAdminAuthenticated ? (
            <AdminPortalView
              disasters={disasters}
              donations={donations}
              disbursements={disbursements}
              partners={partners}
              allocations={allocations}
              reports={reports}
              auditLogs={auditLogs}
              onRefreshBMKG={handleAdminRefreshBMKG}
              onDataChanged={loadData}
            />
          ) : (
            <Navigate to="/admin/auth" replace />
          )
        }
      />
      <Route
        path="/admin/:feature"
        element={
          isAdminAuthenticated ? (
            <AdminPortalView
              disasters={disasters}
              donations={donations}
              disbursements={disbursements}
              partners={partners}
              allocations={allocations}
              reports={reports}
              auditLogs={auditLogs}
              onRefreshBMKG={handleAdminRefreshBMKG}
              onDataChanged={loadData}
            />
          ) : (
            <Navigate to="/admin/auth" replace />
          )
        }
      />

      {/* 7. Partner Authentication & Dashboard Routes */}
      <Route path="/partner/auth" element={<PartnerAuthPage />} />
      <Route
        path="/partner"
        element={
          isPartnerAuthenticated ? (
            <PartnerDashboardView
              allocations={allocations}
              reports={reports}
              donations={donations}
              disasters={disasters}
              onDataChanged={loadData}
            />
          ) : (
            <Navigate to="/partner/auth" replace />
          )
        }
      />
      <Route
        path="/partner/:feature"
        element={
          isPartnerAuthenticated ? (
            <PartnerDashboardView
              allocations={allocations}
              reports={reports}
              donations={donations}
              disasters={disasters}
              onDataChanged={loadData}
            />
          ) : (
            <Navigate to="/partner/auth" replace />
          )
        }
      />

      {/* 8. Public Static Pages */}
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/refund-policy" element={<RefundPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <HackathonBanner />
          <MainRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
