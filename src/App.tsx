import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './domains/access/AuthContext';
import { ToastProvider, useToast } from './components/feedback/Toast';
import { MinimalistLanding } from './components/landing/MinimalistLanding';
import { WideNavbar } from './components/layout/WideNavbar';
import { WideDisasterDashboard } from './domains/disaster/WideDisasterDashboard';
import { WideFooter } from './components/layout/WideFooter';
import { UserLoginPage } from './domains/access/UserLoginPage';
import { MyDonationsPage } from './domains/donation/MyDonationsPage';
import { SituationAnalysisPage } from './domains/disaster/SituationAnalysisPage';
import { TransparansiReportsPage } from './domains/distribution/TransparansiReportsPage';
import { KatalogBMKGPage } from './domains/disaster/KatalogBMKGPage';
import { TransactionUniversalDispatcher } from './domains/donation/TransactionUniversalDispatcher';
import { TransactionDonatePage } from './domains/donation/TransactionDonatePage';
import { TransactionCheckoutPage } from './domains/donation/TransactionCheckoutPage';
import { TransactionStatusPage } from './domains/donation/TransactionStatusPage';
import { AdminAuthPage } from './domains/admin/AdminAuthPage';
import { AdminPortalView } from './domains/admin/AdminPortalView';
import { PartnerAuthPage } from './domains/partner/PartnerAuthPage';
import { PartnerDashboardView } from './domains/partner/PartnerDashboardView';
import { CardSkeleton } from './components/feedback/Skeleton';
import { HackathonBanner } from './components/layout/HackathonBanner';
import { FaqPage } from './domains/public/FaqPage';
import { RefundPolicyPage } from './domains/public/RefundPolicyPage';
import { TermsPage } from './domains/public/TermsPage';
import { ContactPage } from './domains/public/ContactPage';
import {
  getDisasters,
  getUserDonations,
  getAllDonations,
  getDisbursements,
  getPartners,
  getPartnerAllocations,
  getDistributionReports,
  getAuditLogs,
  saveBMKGDisaster,
} from './integrations/firebase/firestore';
import { fetchAutogempa, fetchGempaterkini } from './integrations/bmkg/client';
import {
  Disaster,
  Donation,
  Disbursement,
  Partner,
  PartnerAllocation,
  DistributionReport,
  AuditLog,
} from './types';

// User Dashboard View Wrapper
function UserDashboardPage({
  disasters,
  donations,
  reports,
  partners,
  dataLoading,
  onRefreshBMKG,
}: {
  disasters: Disaster[];
  donations: Donation[];
  reports: DistributionReport[];
  partners: Partner[];
  dataLoading: boolean;
  onRefreshBMKG: () => Promise<void>;
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 selection:bg-[#B2D850] selection:text-[#1B3322]">
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
            donations={donations}
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
      // 1. Check if system needs initial BMKG pool ingestion in Firestore (Admin only)
      if (isAdminAuthenticated) {
        try {
          const existingDisasters = await getDisasters('all');
          if (existingDisasters.length === 0) {
            // Ingest BMKG data directly into Firestore
            const autoGempa = await fetchAutogempa();
            const recentList = await fetchGempaterkini();
            if (autoGempa) {
              autoGempa.disaster.status = 'pending_verification';
              autoGempa.disaster.verificationMethod = 'pending';
              await saveBMKGDisaster(autoGempa.event, autoGempa.disaster);
            }
            for (const item of recentList) {
              item.disaster.status = 'pending_verification';
              item.disaster.verificationMethod = 'pending';
              await saveBMKGDisaster(item.event, item.disaster);
            }
          }
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
      // Ingest any latest BMKG data as pending_verification into the pool
      const autoGempa = await fetchAutogempa();
      if (autoGempa) {
        autoGempa.disaster.status = 'pending_verification';
        autoGempa.disaster.verificationMethod = 'pending';
        await saveBMKGDisaster(autoGempa.event, autoGempa.disaster);
      }
      const recent = await fetchGempaterkini();
      for (const item of recent) {
        item.disaster.status = 'pending_verification';
        item.disaster.verificationMethod = 'pending';
        await saveBMKGDisaster(item.event, item.disaster);
      }

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
      const autogempa = await fetchAutogempa();
      if (autogempa) {
        autogempa.disaster.status = 'pending_verification';
        autogempa.disaster.verificationMethod = 'pending';
        await saveBMKGDisaster(autogempa.event, autogempa.disaster);
      }
      const recent = await fetchGempaterkini();
      for (const item of recent) {
        item.disaster.status = 'pending_verification';
        item.disaster.verificationMethod = 'pending';
        await saveBMKGDisaster(item.event, item.disaster);
      }
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
          <div className="w-10 h-10 border-4 border-[#1B3322] border-t-[#B2D850] rounded-full animate-spin mx-auto" />
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
            donations={donations}
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
