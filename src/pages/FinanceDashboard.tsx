import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useApp } from '../context/AppContext';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { supabase } from '../services/supabase';
import { formatCurrency } from '../services/mockData';
import { 
   
  Briefcase, 
  Trash2,
  Plus, 
  X, 
  Download,
  
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Star,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  description: string;
  created_at: string;
  staff_id?: string;
}

interface PartnerWithdrawal {
  id: string;
  partner_name: string;
  amount: number;
  withdrawal_date: string;
  description: string;
  created_at: string;
}

interface StaffIncome {
  staffId: string;
  fullName: string;
  designation: string;
  totalAmount: number;
  count: number;
}

interface ExpenseCategoryGroup {
  category: string;
  totalAmount: number;
  ashifAmount: number;
  shibiliAmount: number;
  items: Expense[];
}

export const FinanceDashboard: React.FC = () => {
  const { activeStaff, setActiveTab, isAdminMode, addSale,  } = useApp();

  if (!activeStaff) return null;

  useEffect(() => {
    if (!isAdminMode) {
      setActiveTab('sales');
    }
  }, [isAdminMode]);

  // Selected ledger month (e.g. '2026-07')
  const [selectedLedgerMonth, setSelectedLedgerMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  // Ledger calculation states
  const [openingBalance, setOpeningBalance] = useState(0);
  const [historicalBalance, setHistoricalBalance] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempHistoricalBalance, setTempHistoricalBalance] = useState('');
  const [staffIncomesList, setStaffIncomesList] = useState<StaffIncome[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryGroup[]>([]);
  const [partnerWithdrawals, setPartnerWithdrawals] = useState<{ [partner: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Raw fetched lists for drill-downs & totals
  const [salesList, setSalesList] = useState<any[]>([]);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);
  const [withdrawalsList, setWithdrawalsList] = useState<PartnerWithdrawal[]>([]);
  const [staffProfilesMap, setStaffProfilesMap] = useState<Map<string, { name: string; desig: string }>>(new Map());

  // Modal / Side-Drawer state
  const [isEntryDrawerOpen, setIsEntryDrawerOpen] = useState(false);
  const [entryTab, setEntryTab] = useState<'income' | 'expense' | 'withdrawal'>('income');
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  // Drill-down Modal State
  const [drilldownCategory, setDrilldownCategory] = useState<ExpenseCategoryGroup | null>(null);


  // Add Income (Sale) Form states
  const [incClientName, setIncClientName] = useState('');
  const [incServicePkg, setIncServicePkg] = useState('');
  const [incPaymentType, setIncPaymentType] = useState<'Full' | 'Advance' | 'Clearance'>('Advance');
  const [incPackageAmt, setIncPackageAmt] = useState('');
  const [incRecAmt, setIncRecAmt] = useState('');
  const [incPaymentMethod, setIncPaymentMethod] = useState('UPI');
  const [isAddingIncome, setIsAddingIncome] = useState(false);

  // Add Expense Form states
  const [expCategory, setExpCategory] = useState('Salary');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expDescription, setExpDescription] = useState('');
  const [isAddingExpense, setIsAddingExpense] = useState(false);



  // Load all finance details
  const loadFinanceData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const [year, monthIdx] = selectedLedgerMonth.split('-').map(Number);
      const startOfMonthStr = `${year}-${String(monthIdx).padStart(2, '0')}-01T00:00:00+00:00`;
      
      const lastDay = new Date(year, monthIdx, 0).getDate();
      const endOfMonthStr = `${year}-${String(monthIdx).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+00:00`;
      const endOfMonthDateStr = `${year}-${String(monthIdx).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // 1. Fetch historical opening balance
      const { data: settingsData } = await supabase.from('finance_settings').select('historical_opening_balance');
        let histBal = 0;
        if (settingsData && settingsData.length > 0) {
          histBal = Number(settingsData[0].historical_opening_balance) || 0;
        }
        setHistoricalBalance(histBal);

      // 2. Calculate opening balance (carry-over of previous month's closing balance)
      // All-time income before this month
      const { data: prevSales } = await supabase
        .from('sales')
        .select('received_amount')
        .lt('created_at', startOfMonthStr);
      const prevSalesSum = prevSales?.reduce((sum, s) => sum + (s.received_amount || 0), 0) || 0;

      // All-time expenses before this month
      const { data: prevExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .lt('expense_date', `${year}-${String(monthIdx).padStart(2, '0')}-01`);
      const prevExpensesSum = prevExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // All-time withdrawals before this month
      const { data: prevWithdrawals } = await supabase
        .from('partner_withdrawals')
        .select('amount')
        .lt('withdrawal_date', `${year}-${String(monthIdx).padStart(2, '0')}-01`);
      const prevWithdrawalsSum = prevWithdrawals?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;

      const calculatedOpeningBal = histBal + prevSalesSum - prevExpensesSum - prevWithdrawalsSum;
      setOpeningBalance(calculatedOpeningBal);

      // 2. Fetch staff profiles & general staff records to create name and designation mappings
      const { data: profilesData } = await supabase
        .from('staff_profiles')
        .select('id, full_name, designation');

      const { data: staffData } = await supabase
        .from('staff')
        .select('id, full_name');

      const profilesMap = new Map<string, { name: string; desig: string }>();
      const staffIdToNameMap = new Map<string, string>();
      const staffIdToDesigMap = new Map<string, string>();

      (profilesData || []).forEach(p => {
        profilesMap.set(p.id, { name: p.full_name, desig: p.designation || 'Staff' });
        staffIdToNameMap.set(p.id, p.full_name);
        staffIdToDesigMap.set(p.id, p.designation || 'Staff');
      });

      (staffData || []).forEach(s => {
        if (!staffIdToNameMap.has(s.id)) {
          staffIdToNameMap.set(s.id, s.full_name);
          staffIdToDesigMap.set(s.id, 'Staff');
        }
      });
      setStaffProfilesMap(profilesMap);

      // 3. Fetch sales for the current month
      const { data: salesData, error: salesErr } = await supabase
        .from('sales')
        .select('*, staff(full_name)')
        .gte('created_at', startOfMonthStr)
        .lte('created_at', endOfMonthStr);

      if (salesErr) throw salesErr;
      setSalesList(salesData || []);

      // Group sales by staff member (Income Left Column)
      const incomeGroupMap = new Map<string, { total: number; count: number; name: string; desig: string }>();
      (salesData || []).forEach((sale: any) => {
        const staffId = sale.staff_id;
        const name = sale.staff?.full_name || staffIdToNameMap.get(staffId) || 'Rahul Sharma';
        const desig = staffIdToDesigMap.get(staffId) || 'Sales Executive';
        
        // Exclude Company Owners from the Global Leaderboard / Staff Incomes List
        // Owners are now included in the leaderboard
        // if (desig === 'Company Owner') return;

        const existing = incomeGroupMap.get(staffId) || { total: 0, count: 0, name, desig };
        existing.total += sale.received_amount || 0;
        existing.count += 1;
        incomeGroupMap.set(staffId, existing);
      });

      const staffIncomesArray: StaffIncome[] = Array.from(incomeGroupMap.entries()).map(([id, info]) => ({
        staffId: id,
        fullName: info.name,
        designation: info.desig,
        totalAmount: info.total,
        count: info.count
      })).sort((a, b) => b.totalAmount - a.totalAmount);
      setStaffIncomesList(staffIncomesArray);

      // 4. Fetch expenses for the current month
      const { data: expData, error: expErr } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', `${year}-${String(monthIdx).padStart(2, '0')}-01`)
        .lte('expense_date', endOfMonthDateStr);

      if (expErr) throw expErr;
      setExpensesList(expData || []);

      // Group expenses by valid categories and calculate split
      const validCategories = ['Salary', 'Rent', 'Internet & Recharge', 'Food & Drinks', 'EMI', 'Repair & Maintenance', 'Stationery', 'Electricity', 'Transport', 'Fixed Asset', 'Outwork', 'Return Sales', 'Facebook Ads', 'Other Expense'];
      const expCategoriesArray: ExpenseCategoryGroup[] = validCategories.map(cat => {
        const items = (expData || []).filter((e: Expense) => e.category === cat);
        let ashifAmt = 0;
        let shibiliAmt = 0;

        items.forEach((exp: Expense) => {
          const loggedByName = exp.staff_id ? (staffIdToNameMap.get(exp.staff_id) || '').toUpperCase() : '';
          if (loggedByName.includes('SHIBILI')) {
            shibiliAmt += exp.amount;
          } else {
            ashifAmt += exp.amount;
          }
        });

        return {
          category: cat,
          totalAmount: ashifAmt + shibiliAmt,
          ashifAmount: ashifAmt,
          shibiliAmount: shibiliAmt,
          items: items.sort((a: Expense, b: Expense) => b.expense_date.localeCompare(a.expense_date))
        };
      });
      setExpenseCategories(expCategoriesArray);

      // 5. Fetch partner withdrawals for the current month
      const { data: witData, error: witErr } = await supabase
        .from('partner_withdrawals')
        .select('*')
        .gte('withdrawal_date', `${year}-${String(monthIdx).padStart(2, '0')}-01`)
        .lte('withdrawal_date', endOfMonthDateStr);

      if (witErr) throw witErr;
      setWithdrawalsList(witData || []);

      // Group partner withdrawals by partner name
      const witGroupMap: { [partner: string]: number } = {};
      (witData || []).forEach((wit: PartnerWithdrawal) => {
        witGroupMap[wit.partner_name] = (witGroupMap[wit.partner_name] || 0) + wit.amount;
      });
      setPartnerWithdrawals(witGroupMap);

    } catch (err: any) {
      console.error('Error loading finance details:', err);
      setDbError(err.message || 'Failed to sync finance dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [selectedLedgerMonth]);

  // Log Income (Sale) Submission
  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incClientName || !incPackageAmt || !incRecAmt || !incServicePkg) return;

    setIsAddingIncome(true);
    try {
      await addSale({
        clientName: incClientName.trim(),
        servicePackage: incServicePkg.trim(),
        paymentType: incPaymentType,
        packageAmount: Number(incPackageAmt) || 0,
        receivedAmount: Number(incRecAmt) || 0,
        paymentMethod: incPaymentMethod
      });

      // Reset
      setIncClientName('');
      setIncServicePkg('');
      setIncPackageAmt('');
      setIncRecAmt('');
      setIncPaymentType('Advance');
      setIncPaymentMethod('UPI');
      setIsEntryDrawerOpen(false);

      alert('Income logged successfully!');
      await loadFinanceData();
    } catch (err: any) {
      alert('Failed to log income: ' + err.message);
    } finally {
      setIsAddingIncome(false);
    }
  };

  // Log Expense Submission
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || !expDate) return;

    setIsAddingExpense(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          category: expCategory,
          amount: Number(expAmount),
          expense_date: expDate,
          description: expDescription.trim() || null,
          staff_id: activeStaff.id
        });

      if (error) throw error;

      // Reset
      setExpAmount('');
      setExpDescription('');
      setExpCategory('Salary');
      setExpDate(new Date().toISOString().split('T')[0]);
      setIsEntryDrawerOpen(false);

      alert('Expense logged successfully!');
      await loadFinanceData();
    } catch (err: any) {
      alert('Failed to log expense: ' + err.message);
    } finally {
      setIsAddingExpense(false);
    }
  };


  // Delete Expense
  const handleDeleteExpense = async (id: string, category: string, amount: number) => {
    if (!confirm(`Are you sure you want to delete this ${category} entry of ${formatCurrency(amount)}?`)) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update drill-down modal items dynamically
      if (drilldownCategory) {
        const updatedItems = drilldownCategory.items.filter(item => item.id !== id);
        const updatedTotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
        setDrilldownCategory({
          ...drilldownCategory,
          totalAmount: updatedTotal,
          items: updatedItems
        });
      }

      await loadFinanceData();
    } catch (err: any) {
      alert('Failed to delete expense: ' + err.message);
    }
  };

  const handleSaveHistoricalBalance = async () => {
    try {
      const parsed = parseFloat(tempHistoricalBalance);
      if (isNaN(parsed)) throw new Error("Invalid number");

      const { data: settingsData } = await supabase.from('finance_settings').select('id').limit(1).maybeSingle();
      if (settingsData?.id) {
        await supabase.from('finance_settings').update({ historical_opening_balance: parsed }).eq('id', settingsData.id);
      } else {
        await supabase.from('finance_settings').insert({ historical_opening_balance: parsed });
      }
      setHistoricalBalance(parsed);
      setIsSettingsOpen(false);
      loadFinanceData();
    } catch (err: any) {
      alert("Failed to save historical balance: " + err.message);
    }
  };

  // Export Entire Monthly Ledger layout to CSV
  const handleExportLedger = async () => {
    try {
      const isAllTime = window.confirm("Do you want to export the ALL-TIME Master Ledger? \n\nClick 'OK' for All-Time history.\nClick 'Cancel' for the selected month only.");
      
      let exportSales = salesList;
      let exportExpenses = expensesList;
      let exportWithdrawals = withdrawalsList;
      
      let titleMonth = selectedLedgerMonth;
      
      if (isAllTime) {
        titleMonth = "ALL TIME";
        const [salesRes, expRes, withRes] = await Promise.all([
          supabase.from('sales').select('*, staff(full_name)').order('created_at', { ascending: true }),
          supabase.from('expenses').select('*').order('expense_date', { ascending: true }),
          supabase.from('partner_withdrawals').select('*').order('withdrawal_date', { ascending: true })
        ]);
        exportSales = salesRes.data || [];
        exportExpenses = expRes.data || [];
        exportWithdrawals = withRes.data || [];
      }

      const csvRows = [];
      csvRows.push([`Tech Ads Master Finance Ledger - ${titleMonth}`]);
      csvRows.push([`Historical Opening Balance`, historicalBalance]);
      if (!isAllTime) {
        csvRows.push([`Opening Balance (Carry over)`, openingBalance]);
      }
      csvRows.push([]);

      // Section 1: DETAILED INCOME
      csvRows.push(['--- DETAILED INCOME LOGS ---']);
      csvRows.push(['Date', 'Client Name', 'Service Package', 'Payment Type', 'Payment Method', 'Amount', 'Logged By']);
      exportSales.forEach(sale => {
        const loggedBy = sale.staff?.full_name || staffProfilesMap.get(sale.staff_id)?.name || 'Unknown';
        const date = new Date(sale.created_at).toLocaleDateString();
        csvRows.push([date, sale.client_name, sale.service_package, sale.payment_type || '-', sale.payment_method || 'UPI', sale.received_amount, loggedBy]);
      });
      const exportTotalIncome = exportSales.reduce((sum, s) => sum + (Number(s.received_amount) || 0), 0);
      csvRows.push(['Total Income', '', '', '', '', exportTotalIncome, '']);
      csvRows.push([]);

      // Section 2: DETAILED EXPENSES
      csvRows.push(['--- DETAILED EXPENSE LOGS ---']);
      csvRows.push(['Date', 'Category', 'Description', 'Amount', 'Logged By']);
      exportExpenses.forEach(exp => {
        const loggedBy = exp.staff_id ? (staffProfilesMap.get(exp.staff_id)?.name || 'Unknown') : 'Unknown';
        csvRows.push([exp.expense_date, exp.category, exp.description, exp.amount, loggedBy]);
      });
      const exportTotalExpenses = exportExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      csvRows.push(['Total Expenses', '', '', exportTotalExpenses, '']);
      csvRows.push([]);

      // Section 3: PARTNER WITHDRAWALS
      csvRows.push(['--- PARTNER WITHDRAWALS ---']);
      csvRows.push(['Date', 'Partner Name', 'Description', 'Amount']);
      exportWithdrawals.forEach(w => {
        csvRows.push([w.withdrawal_date, w.partner_name, w.description, w.amount]);
      });
      const exportTotalWithdrawals = exportWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
      csvRows.push(['Total Partner Withdrawals', '', '', exportTotalWithdrawals]);
      csvRows.push([]);

      // Summary Recap
      csvRows.push(['--- SUMMARY CALCULATIONS ---']);
      csvRows.push(['Historical Opening Balance', historicalBalance]);
      if (!isAllTime) {
        csvRows.push(['Opening Balance (Start of Month)', openingBalance]);
      }
      csvRows.push(['Total Income', exportTotalIncome]);
      csvRows.push(['Total Expenses', exportTotalExpenses]);
      csvRows.push(['Net Profit / Loss', exportTotalIncome - exportTotalExpenses]);
      csvRows.push(['Total Withdrawals', exportTotalWithdrawals]);
      
      const calcBalance = isAllTime 
        ? (historicalBalance + exportTotalIncome - exportTotalExpenses - exportTotalWithdrawals)
        : (openingBalance + exportTotalIncome - exportTotalExpenses - exportTotalWithdrawals);
      csvRows.push(['Current Remaining Balance', calcBalance]);

      const csvContent = csvRows.map(row => row.map(val => `"${val}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Master_Ledger_Dashboard_${selectedLedgerMonth}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to export monthly ledger: ' + err.message);
    }
  };

  // Month select options
  const getLedgerMonthOptions = () => {
    const options = [];
    const date = new Date();
    const currentYear = date.getFullYear();
    
    let startYear = 2026;
    let startMonth = 0;
    
    const endYear = currentYear + 1;
    const endMonth = 11;
    
    let y = startYear;
    let m = startMonth;
    
    while (y < endYear || (y === endYear && m <= endMonth)) {
      const val = `${y}-${String(m + 1).padStart(2, '0')}`;
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const label = `${months[m]} ${y}`;
      options.push({ value: val, label });
      
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
    return options.reverse();
  };

  // Summary Metrics calculations
  const summaryTotalIncome = salesList.reduce((sum, s) => sum + (Number(s.received_amount) || 0), 0);
  const summaryTotalExpenses = expenseCategories.reduce((sum, r) => sum + r.totalAmount, 0);
  const summaryNetProfit = summaryTotalIncome - summaryTotalExpenses;
  const summaryTotalWithdrawals = withdrawalsList.reduce((sum, r) => sum + r.amount, 0);
  const finalCompanyBalance = openingBalance + summaryTotalIncome - summaryTotalExpenses - summaryTotalWithdrawals;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex relative overflow-x-hidden">
      {/* Background Lighting Glows */}
      <div className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-indigo-900/15 blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-20%] w-[80vw] h-[80vw] rounded-full bg-purple-900/10 blur-[130px] pointer-events-none"></div>

      {/* Left Sidebar Navigation (Desktop only) */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 pb-24 md:pb-8">
        
        {/* Header Bar */}
        <header className="glass-panel sticky top-0 z-30 px-4 md:px-8 py-3.5 border-b border-white/5 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-base md:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                Financial Control Center
              </h1>
              <select
                value={selectedLedgerMonth}
                onChange={(e) => setSelectedLedgerMonth(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-350 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                {getLedgerMonthOptions().map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button 
                onClick={() => { setTempHistoricalBalance(historicalBalance.toString()); setIsSettingsOpen(true); }}
                className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Finance "
              >
                <Star className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                className="!py-2 !px-3.5 shadow-md rounded-xl text-xs font-bold shrink-0 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10"
                onClick={() => setIsAnalyticsModalOpen(true)}
                icon={<Activity className="w-3.5 h-3.5" />}
              >
                View Analytics
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                className="!py-2 !px-3.5 shadow-md rounded-xl text-xs font-bold shrink-0" 
                onClick={() => setIsEntryDrawerOpen(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Log Transaction
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-6xl w-full mx-auto px-4 md:px-8 mt-6 space-y-6">
          {dbError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl flex items-center gap-3 text-rose-450 text-xs">
              <span className="font-bold">Database Error:</span> {dbError}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-450 gap-3 text-sm font-bold uppercase tracking-wider">
              <svg className="animate-spin h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Syncing Ledger Book...</span>
            </div>
          ) : (
            <>
              {/* Overview Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-8 gap-3">
                <Card variant="glass" glowColor="none" className="p-3.5 flex flex-col justify-between border-white/5 bg-slate-900/40">
                  <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Opening Bal</span>
                  <p className="text-sm md:text-base font-extrabold text-white mt-1.5">{formatCurrency(openingBalance)}</p>
                </Card>

                <Card variant="glass" glowColor="none" className="p-3.5 flex flex-col justify-between border-white/5 bg-slate-900/40">
                  <span className="text-[8.5px] font-bold text-emerald-400 uppercase tracking-wider">Total Income</span>
                  <p className="text-sm md:text-base font-extrabold text-emerald-400 mt-1.5">{formatCurrency(summaryTotalIncome)}</p>
                </Card>

                <Card variant="glass" glowColor="none" className="p-3.5 flex flex-col justify-between border-white/5 bg-slate-900/40">
                  <span className="text-[8.5px] font-bold text-rose-400 uppercase tracking-wider">Total Expenses</span>
                  <p className="text-sm md:text-base font-extrabold text-rose-400 mt-1.5">{formatCurrency(summaryTotalExpenses)}</p>
                </Card>

                <Card variant="solid" className={`p-4 flex flex-col justify-between shadow-lg relative overflow-hidden md:col-span-2 ${summaryNetProfit >= 0 ? 'bg-emerald-900/10 border-emerald-500/40 shadow-emerald-500/10' : 'bg-rose-900/10 border-rose-500/40 shadow-rose-500/10'}`}>
                  <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full blur-xl ${summaryNetProfit >= 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}></div>
                  <div className="flex justify-between items-start relative z-10">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${summaryNetProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>Net Profit/Loss</span>
                    <Badge variant={summaryNetProfit >= 0 ? 'success' : 'error'} className="text-[10px] py-0.5 font-bold">
                      {summaryTotalIncome > 0 ? ((summaryNetProfit / summaryTotalIncome) * 100).toFixed(1) : 0}%
                    </Badge>
                  </div>
                  <p className={`text-lg md:text-2xl font-black mt-1 relative z-10 ${summaryNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(summaryNetProfit)}</p>
                </Card>

                <Card variant="glass" glowColor="none" className="p-3.5 flex flex-col justify-between border-white/5 bg-slate-900/40">
                  <span className="text-[8.5px] font-bold text-purple-400 uppercase tracking-wider">Partner Withdraw</span>
                  <p className="text-sm md:text-base font-extrabold text-purple-400 mt-1.5">{formatCurrency(summaryTotalWithdrawals)}</p>
                </Card>

                <Card variant="solid" className="p-4 flex flex-col justify-between border-indigo-500/40 bg-indigo-900/10 shadow-lg shadow-indigo-500/10 relative overflow-hidden md:col-span-2">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/20 rounded-bl-full blur-xl"></div>
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider relative z-10">Company Remaining Balance</span>
                  <p className="text-lg md:text-2xl font-black text-indigo-400 mt-1 relative z-10">{formatCurrency(finalCompanyBalance)}</p>
                </Card>
              </div>

              {/* Master Ledger Redesign Two-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* LEFT COLUMN: Income List by Staff */}
                <Card variant="glass" className="p-5 border-white/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                      <ArrowUpRight className="w-5 h-5 text-emerald-400 animate-pulse" />
                      Monthly Incomes (Sales by Staff)
                    </h3>
                    <Badge variant="success" className="text-[9px] py-0.5">{staffIncomesList.length} staff</Badge>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900/60 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/5">
                          <th className="py-2.5 px-3">Staff Member</th>
                          <th className="py-2.5 px-3">Designation</th>
                          <th className="py-2.5 px-3 text-center">Sales Count</th>
                          <th className="py-2.5 px-3 text-right">Total Income</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {staffIncomesList.map(item => (
                          <tr key={`inc-${item.staffId}`} className="hover:bg-slate-900/30 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-200">{item.fullName}</td>
                            <td className="py-2.5 px-3 text-slate-400">{item.designation}</td>
                            <td className="py-2.5 px-3 text-center text-slate-500 font-bold">{item.count}</td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-emerald-400">{formatCurrency(item.totalAmount)}</td>
                          </tr>
                        ))}
                        {staffIncomesList.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center py-6 text-slate-500 font-bold uppercase text-[10px]">No sales recorded.</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="border-t border-white/10 bg-slate-900/40 text-white font-extrabold">
                        <tr>
                          <td colSpan={3} className="py-2.5 px-3 uppercase text-[9px] text-slate-400 text-right">Total Monthly Income:</td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-extrabold">{formatCurrency(summaryTotalIncome)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>

                {/* RIGHT COLUMN: Expenses Organized by Categories + Partner Withdrawals */}
                <Card variant="glass" className="p-5 border-white/5 space-y-5">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                      <ArrowDownRight className="w-5 h-5 text-rose-400 animate-pulse" />
                      Monthly Expenses
                    </h3>
                    <Badge variant="error" className="text-[9px] py-0.5">{expensesList.length} entries</Badge>
                  </div>

                  {/* Categorized Expenses with Splits */}
                  <div className="grid grid-cols-1 gap-2 border border-white/5 bg-slate-900/30 rounded-xl p-3">
                    {/* Header Row */}
                    <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 pb-2 border-b border-white/5">
                      <div className="flex-1">Category</div>
                      <div className="w-20 text-right">ASHIF</div>
                      <div className="w-20 text-right">SHIBILI</div>
                      <div className="w-24 text-right">Total</div>
                    </div>
                    {/* Rows */}
                    {expenseCategories.map(cat => (
                      <div 
                        key={`cat-${cat.category}`} 
                        onClick={() => cat.items.length > 0 && setDrilldownCategory(cat)}
                        className={`flex items-center px-2 py-2.5 rounded-lg transition-all ${cat.items.length > 0 ? 'hover:bg-slate-800/50 cursor-pointer' : 'opacity-60'}`}
                      >
                        <div className="flex-1 flex items-center gap-2 text-xs font-bold text-slate-200">
                          {cat.category}
                          {cat.items.length > 0 && <Badge variant="purple" className="text-[8px] py-0 px-1 font-extrabold">{cat.items.length}</Badge>}
                        </div>
                        <div className="w-20 text-right text-[11px] font-medium text-slate-400">{cat.ashifAmount > 0 ? formatCurrency(cat.ashifAmount) : '-'}</div>
                        <div className="w-20 text-right text-[11px] font-medium text-slate-400">{cat.shibiliAmount > 0 ? formatCurrency(cat.shibiliAmount) : '-'}</div>
                        <div className="w-24 text-right text-xs font-extrabold text-rose-400">{formatCurrency(cat.totalAmount)}</div>
                      </div>
                    ))}
                    
                    {/* Grand Totals */}
                    <div className="flex items-center px-2 py-3 mt-2 border-t border-white/10 bg-slate-900/50 rounded-lg">
                      <div className="flex-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">Grand Total</div>
                      <div className="w-20 text-right text-[11px] font-bold text-slate-300">
                        {formatCurrency(expenseCategories.reduce((sum, cat) => sum + cat.ashifAmount, 0))}
                      </div>
                      <div className="w-20 text-right text-[11px] font-bold text-slate-300">
                        {formatCurrency(expenseCategories.reduce((sum, cat) => sum + cat.shibiliAmount, 0))}
                      </div>
                      <div className="w-24 text-right text-sm font-black text-rose-500">
                        {formatCurrency(summaryTotalExpenses)}
                      </div>
                    </div>
                  </div>

                  {/* Partner Withdrawals Read-Only Book */}
                  <div className="pt-4 border-t border-white/5">
                    <h3 className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 text-purple-400" />
                      Partner Withdrawals Book
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {['SHIBILI', 'ASHIF'].map((partnerName) => (
                        <div key={`wit-${partnerName}`} className="p-4 rounded-xl border border-white/5 bg-slate-950/40 flex flex-col items-center justify-center space-y-2">
                          <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">{partnerName}</span>
                          <span className="font-black text-purple-400 text-lg">
                            {formatCurrency(partnerWithdrawals[partnerName] || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>


                </Card>
              </div>

              {/* Bottom Exporter Controls */}
              <div className="pt-4 flex justify-end">
                <Button 
                  variant="glass" 
                  onClick={handleExportLedger}
                  className="flex items-center gap-2 font-bold text-xs uppercase text-indigo-400 border-indigo-500/20 hover:bg-slate-800"
                  icon={<Download className="w-4 h-4" />}
                >
                  Download Ledger (CSV)
                </Button>
              </div>
            </>
          )}
        </main>
      </div>

      {/* TRANSACTION DATA ENTRY SLIDE-DRAWER */}
      {isEntryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fade-in">
          {/* Backdrop Click */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsEntryDrawerOpen(false)} />
          
          {/* Drawer Body */}
          <div className="w-full max-w-sm h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between relative shadow-2xl animate-slide-in-right z-10 overflow-y-auto">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Star className="w-5 h-5 text-indigo-400" />
                  Financial Data Entry
                </h3>
                <button 
                  onClick={() => setIsEntryDrawerOpen(false)}
                  className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mb-4">Select the tab below to log incomes or expenses.</p>

              {/* Entry Tab Selector */}
              <div className="flex border-b border-white/5 mb-5 text-xs font-bold uppercase tracking-wider">
                <button 
                  onClick={() => setEntryTab('income')}
                  className={`flex-1 pb-2 border-b-2 text-center transition-all ${entryTab === 'income' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-355'}`}
                >
                  Log Income
                </button>
                <button 
                  onClick={() => setEntryTab('expense')}
                  className={`flex-1 pb-2 border-b-2 text-center transition-all ${entryTab === 'expense' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-355'}`}
                >
                  Log Expense
                </button>
              </div>

              {/* Tab 1: Log Income */}
              {entryTab === 'income' && (
                <form onSubmit={handleAddIncome} className="space-y-4 text-xs text-left">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Client Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Acme Corp"
                      value={incClientName}
                      onChange={(e) => setIncClientName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Service Package</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. SEO & Content Pack"
                      value={incServicePkg}
                      onChange={(e) => setIncServicePkg(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block">Status</label>
                      <select
                        value={incPaymentType}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setIncPaymentType(val);
                          if (val === 'Full') {
                            setIncRecAmt(incPackageAmt);
                          } else if (val === 'Clearance') {
                            setIncPackageAmt('0');
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Advance">Advance</option>
                        <option value="Full">Full Payment</option>
                        <option value="Clearance">Clearance</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block">Method</label>
                      <select
                        value={incPaymentMethod}
                        onChange={(e) => setIncPaymentMethod(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block">Package Amount (₹)</label>
                      <input 
                        type="number" 
                        required
                        disabled={incPaymentType === 'Clearance'}
                        value={incPackageAmt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIncPackageAmt(val);
                          if (incPaymentType === 'Full') {
                            setIncRecAmt(val);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white disabled:opacity-50 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block">Received Amount (₹)</label>
                      <input 
                        type="number" 
                        required
                        disabled={incPaymentType === 'Full'}
                        value={incRecAmt}
                        onChange={(e) => setIncRecAmt(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white disabled:opacity-50 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button type="submit" variant="primary" fullWidth disabled={isAddingIncome}>
                      {isAddingIncome ? 'Logging...' : 'Log Income Entry'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Tab 2: Log Expense */}
              {entryTab === 'expense' && (
                <form onSubmit={handleAddExpense} className="space-y-4 text-xs text-left">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Category</label>
                    <select
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Salary">Salary</option>
                      <option value="Rent">Rent</option>
                      <option value="Internet & Recharge">Internet & Recharge</option>
                      <option value="Food & Drinks">Food & Drinks</option>
                      <option value="EMI">EMI</option>
                      <option value="Repair & Maintenance">Repair & Maintenance</option>
                      <option value="Stationery">Stationery</option>
                      <option value="Electricity">Electricity</option>
                      <option value="Transport">Transport</option>
                      <option value="Fixed Asset">Fixed Asset</option>
                      <option value="Outwork">Outwork</option>
                      <option value="Return Sales">Return Sales</option>
                      <option value="Facebook Ads">Facebook Ads</option>
                      <option value="Other Expense">Other Expense</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Amount (₹)</label>
                    <input 
                      type="number" 
                      required
                      placeholder="e.g. 15000"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Date</label>
                    <input 
                      type="date" 
                      required
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Description</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Office rent for July"
                      value={expDescription}
                      onChange={(e) => setExpDescription(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="pt-4">
                    <Button type="submit" variant="primary" fullWidth disabled={isAddingExpense}>
                      {isAddingExpense ? 'Logging...' : 'Log Expense Entry'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EXPENSE CATEGORY DRILL-DOWN MODAL */}
      {drilldownCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <Card variant="solid" className="w-full max-w-lg p-6 bg-slate-900 border border-slate-800 relative animate-scale-up">
            <button 
              onClick={() => setDrilldownCategory(null)}
              className="absolute top-4 right-4 text-slate-450 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-white text-base mb-1.5 flex items-center gap-2">
              <Star className="w-5 h-5 text-indigo-400" />
              Drill-down: {drilldownCategory.category} Category
            </h3>
            <p className="text-[11px] text-slate-450 mb-4 uppercase font-semibold">Total Category Sum: <span className="text-rose-400 font-extrabold">{formatCurrency(drilldownCategory.totalAmount)}</span></p>

            <div className="overflow-y-auto max-h-96 rounded-xl border border-white/5 scrollbar-none">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/5">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Logged By</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px]">
                  {drilldownCategory.items.map(item => {
                    const loggedByName = staffProfilesMap.get(item.staff_id || '')?.name || 'Admin';
                    return (
                      <tr key={item.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-2 px-3 text-slate-500 font-medium">{item.expense_date}</td>
                        <td className="py-2 px-3 text-slate-200 font-semibold">{item.description || item.category}</td>
                        <td className="py-2 px-3 text-slate-400">{loggedByName}</td>
                        <td className="py-2 px-3 text-right font-bold text-rose-400">{formatCurrency(item.amount)}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleDeleteExpense(item.id, item.category, item.amount)}
                            className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/25 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* PARTNER WITHDRAWAL DRILL-DOWN MODAL */}


      {/* FINANCE SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
          <Card variant="solid" className="w-full max-w-sm p-6 bg-slate-900 border border-slate-800 relative animate-scale-up">
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-indigo-400" />
              Finance 
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-350 mb-1.5">Historical Opening Balance (₹)</label>
                <input
                  type="number"
                  value={tempHistoricalBalance}
                  onChange={(e) => setTempHistoricalBalance(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g. 500000"
                />
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  This balance is added to all-time profits and subtracted by all-time withdrawals to determine the final company remaining balance.
                </p>
              </div>
              
              <Button 
                variant="primary" 
                className="w-full font-bold" 
                onClick={handleSaveHistoricalBalance}
              >
                Save 
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Analytics Modal */}
      {isAnalyticsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
          <Card variant="glass" className="w-full max-w-4xl border-white/10 p-6 animate-scale-up relative">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  Financial Analytics ({selectedLedgerMonth})
                </h3>
                <p className="text-xs text-slate-400 mt-1">Income vs Expenses visualization</p>
              </div>
              <button 
                onClick={() => setIsAnalyticsModalOpen(false)} 
                className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="h-[400px] w-full mt-4">
              {(() => {
                // Generate Daily Data
                const daysInMonth = new Date(parseInt(selectedLedgerMonth.split('-')[0]), parseInt(selectedLedgerMonth.split('-')[1]), 0).getDate();
                const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
                  const dayStr = String(i + 1).padStart(2, '0');
                  const dateMatch = `${selectedLedgerMonth}-${dayStr}`;
                  
                  const dayIncome = salesList
                    .filter(s => s.created_at && s.created_at.startsWith(dateMatch))
                    .reduce((sum, s) => sum + (Number(s.received_amount) || 0), 0);
                    
                  const dayExpense = expensesList
                    .filter(e => e.expense_date === dateMatch)
                    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                    
                  return {
                    name: dayStr,
                    Income: dayIncome,
                    Expenses: dayExpense
                  };
                });

                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                      />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                        formatter={(value: any) => [`₹${value}`, undefined]}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="Income" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FinanceDashboard;
