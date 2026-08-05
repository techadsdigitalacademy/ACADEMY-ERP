import { AppProvider, useApp } from './context/AppContext';
import { Login } from './pages/Login';
import { SalesDashboard } from './pages/SalesDashboard';
import { AdminAttendance } from './pages/AdminAttendance';
import { LeadsCRM } from './pages/LeadsCRM';
import { AcademyDashboard } from './pages/AcademyDashboard';
import { StaffManagement } from './pages/StaffManagement';
import { FinanceDashboard } from './pages/FinanceDashboard';
import { PartnerWithdrawals } from './pages/PartnerWithdrawals';
import { AssetLibrary } from './pages/AssetLibrary';

function DashboardContainer() {
  const { activeStaff, activeTab, isAdminMode } = useApp();

  const isOwner = activeStaff?.designation?.toLowerCase().includes('owner') || false;
  if (!activeStaff) {
    return <Login />;
  }

  const isTutor = activeStaff?.designation?.toLowerCase().includes('tutor') || false;
  const isCounselor = activeStaff?.designation?.toLowerCase().includes('counselor') || false;
  
  if (activeTab === 'assets') return <AssetLibrary />;
  if (activeTab === 'sales' || activeTab === 'history' || activeTab === 'staff-history' || activeTab === 'expense_history' || activeTab === 'reports') return <SalesDashboard />;
  if (activeTab === 'attendance') return (isAdminMode && !isOwner) ? <AdminAttendance /> : <SalesDashboard />;
  if (activeTab.startsWith('academy')) return (isAdminMode || isTutor || isCounselor) ? <AcademyDashboard /> : <SalesDashboard />;
  if (activeTab === 'staff') return (isAdminMode || isOwner) ? <StaffManagement /> : <SalesDashboard />;
  if (activeTab === 'finance') return (isAdminMode || isOwner) ? <FinanceDashboard /> : <SalesDashboard />;
  if (activeTab === 'withdrawals') return (isAdminMode || isOwner) ? <PartnerWithdrawals /> : <SalesDashboard />;
  return <LeadsCRM />;
}

function App() {
  return (
    <AppProvider>
      <DashboardContainer />
    </AppProvider>
  );
}

export default App;
