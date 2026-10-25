import { lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Login } from './pages/Login';
import { PageLoader } from './components/Skeleton';

// Code-split heavy views for instant initial page loading & non-blocking navigation
const SalesDashboard = lazy(() => import('./pages/SalesDashboard').then(m => ({ default: m.SalesDashboard })));
const AdminAttendance = lazy(() => import('./pages/AdminAttendance').then(m => ({ default: m.AdminAttendance })));
const LeadsCRM = lazy(() => import('./pages/LeadsCRM').then(m => ({ default: m.LeadsCRM })));
const AcademyDashboard = lazy(() => import('./pages/AcademyDashboard').then(m => ({ default: m.AcademyDashboard })));
const StaffManagement = lazy(() => import('./pages/StaffManagement').then(m => ({ default: m.StaffManagement })));
const FinanceDashboard = lazy(() => import('./pages/FinanceDashboard').then(m => ({ default: m.FinanceDashboard })));
const PartnerWithdrawals = lazy(() => import('./pages/PartnerWithdrawals').then(m => ({ default: m.PartnerWithdrawals })));
const AssetLibrary = lazy(() => import('./pages/AssetLibrary').then(m => ({ default: m.AssetLibrary })));

function DashboardContainer() {
  const { activeStaff, activeTab, isAdminMode } = useApp();

  const isOwner = activeStaff?.designation?.toLowerCase().includes('owner') || false;
  if (!activeStaff) {
    return <Login />;
  }

  const isTutor = activeStaff?.designation?.toLowerCase().includes('tutor') || false;
  const isCounselor = activeStaff?.designation?.toLowerCase().includes('counselor') || false;
  
  return (
    <Suspense fallback={<PageLoader />}>
      {(() => {
        if (activeTab === 'assets') return <AssetLibrary />;
        if (activeTab === 'sales' || activeTab === 'history' || activeTab === 'staff-history' || activeTab === 'expense_history' || activeTab === 'reports') return <SalesDashboard />;
        if (activeTab === 'attendance') return (isAdminMode || isOwner) ? <AdminAttendance /> : <SalesDashboard />;
        if (activeTab.startsWith('academy')) return (isAdminMode || isTutor || isCounselor || isOwner) ? <AcademyDashboard /> : <SalesDashboard />;
        if (activeTab === 'staff') return (isAdminMode || isOwner) ? <StaffManagement /> : <SalesDashboard />;
        if (activeTab === 'finance') return (isAdminMode || isOwner) ? <FinanceDashboard /> : <SalesDashboard />;
        if (activeTab === 'withdrawals') return (isAdminMode || isOwner) ? <PartnerWithdrawals /> : <SalesDashboard />;
        return <LeadsCRM />;
      })()}
    </Suspense>
  );
}

function App() {
  return (
    <AppProvider>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <DashboardContainer />
      </div>
    </AppProvider>
  );
}

export default App;
