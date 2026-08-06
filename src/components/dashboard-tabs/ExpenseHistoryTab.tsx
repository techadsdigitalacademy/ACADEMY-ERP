import React, { useState, useEffect } from 'react';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { Star, Award, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../services/mockData';
import { supabase } from '../../services/supabase';
import { EditExpenseModal } from '../EditExpenseModal';
import { SalesHistoryLog } from '../SalesHistoryLog';
import { useApp } from '../../context/AppContext';

const formatDateSafe = (dateVal: any) => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal).substring(0, 10);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(dateVal).substring(0, 10);
  }
};

const isSameMonthYear = (dateVal: any, targetMonthKey: any) => {
  if (!dateVal || !targetMonthKey) return true;
  const dStr = String(dateVal).trim();
  const tStr = String(targetMonthKey).trim();

  if (dStr.startsWith(tStr) || tStr.startsWith(dStr)) return true;

  let dYear = 0;
  let dMonth = 0;
  const matchD = dStr.match(/(\d{4})[-/](\d{1,2})/);
  if (matchD) {
    dYear = parseInt(matchD[1], 10);
    dMonth = parseInt(matchD[2], 10);
  } else {
    const dObj = new Date(dStr);
    if (!isNaN(dObj.getTime())) {
      dYear = dObj.getFullYear();
      dMonth = dObj.getMonth() + 1;
    }
  }

  let tYear = 0;
  let tMonth = 0;
  const matchT = tStr.match(/(\d{4})[-/](\d{1,2})/);
  if (matchT) {
    tYear = parseInt(matchT[1], 10);
    tMonth = parseInt(matchT[2], 10);
  } else {
    const monthsMap: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };
    const yearMatch = tStr.match(/\d{4}/);
    if (yearMatch) tYear = parseInt(yearMatch[0], 10);
    const lowerT = tStr.toLowerCase();
    for (const [mName, mNum] of Object.entries(monthsMap)) {
      if (lowerT.includes(mName)) {
        tMonth = mNum;
        break;
      }
    }
  }

  if (dYear > 0 && tYear > 0 && dMonth > 0 && tMonth > 0) {
    return dYear === tYear && dMonth === tMonth;
  }

  const lowerD = dStr.toLowerCase();
  const lowerT = tStr.toLowerCase();
  if (lowerD.includes('2026') && lowerT.includes('2026')) {
    if (lowerD.includes('aug') || lowerD.includes('-08-') || lowerD.includes('-08') || lowerD.endsWith('08')) {
      if (lowerT.includes('aug') || lowerT.includes('-08-') || lowerT.includes('-08') || lowerT.endsWith('08')) return true;
    }
  }

  return false;
};

interface ExpenseHistoryTabProps {
  activeTab: string;
  isOwner: boolean;
  computedMonthSales?: any[];
  ownerExpenses?: any[];
  selectedMonth?: string;
}

export const ExpenseHistoryTab: React.FC<ExpenseHistoryTabProps> = ({
  activeTab,
  isOwner,
  computedMonthSales = [],
  ownerExpenses = [],
  selectedMonth
}) => {
  const { activeStaff } = useApp();
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [deletedExpIds, setDeletedExpIds] = useState<Set<string>>(new Set());
  // Removed local storage listener useEffect block

  const handleDeleteExpense = async (exp: any) => {
    if (!window.confirm(`Are you sure you want to delete this expense entry of ${formatCurrency(exp.amount || 0)} (${exp.category || 'Expense'})?`)) {
      return;
    }

    try {
      const isRefundCat = exp.category === 'Sales Refund' || exp.category === 'Return Sales' || String(exp.id || '').startsWith('converted-refund-');
      const isConvertedRefund = String(exp.id || '').startsWith('converted-refund-');
      const targetSaleId = isConvertedRefund ? String(exp.id).replace('converted-refund-', '') : (exp.sale_id || '');

      // 1. Delete from Supabase tables
      if (isConvertedRefund && targetSaleId && !targetSaleId.startsWith('idx-')) {
        await supabase.from('sales').delete().eq('id', targetSaleId);
      }

      if (exp.id && !exp.id.startsWith('seed-exp-') && !isConvertedRefund) {
        await supabase.from('expenses').delete().eq('id', exp.id);
        await supabase.from('owner_expenses').delete().eq('id', exp.id);
      }

      if (isRefundCat) {
        try {
          const { data: matchingSales } = await supabase
            .from('sales')
            .select('id')
            .eq('payment_type', 'Refund')
            .eq('received_amount', exp.amount || 0);

          if (matchingSales && matchingSales.length > 0) {
            const saleIds = matchingSales.map(s => s.id);
            await supabase.from('sales').delete().in('id', saleIds);
            
            // LocalStorage hacks removed
          }
        } catch (sErr) {
          console.warn('Refund sale delete info:', sErr);
        }
      }

      // 2. LocalStorage hacks removed

      // 3. Dispatch global custom events
      window.dispatchEvent(new CustomEvent('company_expenses_changed', { detail: exp }));
      window.dispatchEvent(new CustomEvent('company_sales_changed', { detail: exp }));

      alert('Expense deleted successfully!');
    } catch (err: any) {
      alert('Failed to delete expense: ' + err.message);
    }
  };

  try {
    const safeSales = Array.isArray(computedMonthSales) ? computedMonthSales : [];

    return (
      <>
        {editingExpense && (
          <EditExpenseModal
            expense={editingExpense}
            onClose={() => setEditingExpense(null)}
            onSaveSuccess={() => {
              window.dispatchEvent(new CustomEvent('company_expenses_changed'));
            }}
          />
        )}
        {/* EXPENSE HISTORY TAB MODULE - Sales History Log */}
        {activeTab === 'history' && isOwner && (
          <section className="space-y-6 pt-2">
            <SalesHistoryLog 
              sales={safeSales} 
              targetAmount={0} 
              isAdmin={true} 
              hideTargetProgress={false}
            />
          </section>
        )}

      {/* EXPENSE HISTORY TAB MODULE - Company Owner Expense Log */}
      {activeTab === 'expense_history' && (() => {
        const propExp = Array.isArray(ownerExpenses) ? ownerExpenses : [];

        const deduppedMap = new Map<string, any>();
        propExp.forEach((exp, idx) => {
          if (exp) {
            const key = exp.id || `${exp.expense_date || exp.created_at}-${exp.amount}-${exp.category}-${idx}`;
            if (!deduppedMap.has(key)) deduppedMap.set(key, exp);
          }
        });
        const safeExpenses = Array.from(deduppedMap.values());

        const activeMonth = selectedMonth || new Date().toISOString().substring(0, 7);

        // Filter out Partner Withdrawals, seed entries, and dynamically deleted IDs / signatures
        const cleanExpenses = safeExpenses.filter(exp => {
          if (!exp) return false;
          const expIdStr = String(exp.id || '');
          const expSaleIdStr = String(exp.sale_id || '');
          const expAmt = Number(exp.amount || 0);
          const expCat = String(exp.category || '');
          const expDateStr = String(exp.expense_date || exp.date || exp.created_at || '').substring(0, 10);

          if (expIdStr && (deletedExpIds.has(expIdStr) || deletedExpIds.has(`converted-refund-${expIdStr}`))) return false;
          if (expSaleIdStr && (deletedExpIds.has(expSaleIdStr) || deletedExpIds.has(`converted-refund-${expSaleIdStr}`))) return false;
          if (deletedExpIds.has(`sig-${expCat}-${expAmt}`)) return false;
          if (expDateStr && deletedExpIds.has(`sig-${expCat}-${expAmt}-${expDateStr}`)) return false;
          if (deletedExpIds.has(`refund-amount-${expAmt}`) || deletedExpIds.has(`amt-${expAmt}`)) return false;

          const cat = expCat.toLowerCase();
          const type = String(exp.type || '').toLowerCase();
          if (cat.includes('withdrawal') || type.includes('withdrawal')) {
            return false;
          }
          return true;
        });

        // Filter expenses strictly by logged-in owner to isolate owner expenses
        const activeNameUpper = (activeStaff?.full_name || '').toUpperCase();
        const activeIdStr = String(activeStaff?.id || '').trim();
        const isAshif = activeNameUpper.includes('ASHIF');
        const isShibili = activeNameUpper.includes('SHIBILI');

        const ownerIsolatedExpenses = cleanExpenses.filter(exp => {
          if (!exp) return false;

          const expStaffIdStr = String(exp.staff_id || '').trim();
          const expNameUpper = (exp.logged_by_name || exp.staff_name || exp.created_by || exp.description || '').toUpperCase();
          const isRefundCat = exp.category === 'Sales Refund' || exp.category === 'Return Sales' || String(exp.id).startsWith('converted-refund-') || String(exp.id).startsWith('exp-refund-');

          if (isShibili) {
            // Shibili MUST ONLY see expenses explicitly created by Shibili
            if (expNameUpper.includes('SHIBILI')) return true;
            if (expStaffIdStr && activeIdStr && expStaffIdStr === activeIdStr) return true;
            // Strictly reject ALL non-Shibili expenses (Ashif expenses, Sales Refunds, unassigned expenses)
            return false;
          }

          if (isAshif) {
            // Ashif MUST NOT see Shibili's personal expenses
            if (expNameUpper.includes('SHIBILI')) return false;
            
            // Ashif sees Ashif's expenses + all automated Sales Refunds
            if (expNameUpper.includes('ASHIF')) return true;
            if (expStaffIdStr && activeIdStr && expStaffIdStr === activeIdStr) return true;
            if (isRefundCat) return true;

            // Default fallback for Ashif portal: reject unassigned or third-party owner expenses
            return false;
          }

          return true;
        });

        // Strictly filter ownerIsolatedExpenses by activeMonth based on expense_date (user selected date)
        const monthFiltered = ownerIsolatedExpenses.filter(exp => {
          const dateVal = exp.expense_date || exp.date || exp.created_at;
          return isSameMonthYear(dateVal, activeMonth);
        });

        // Strictly use monthFiltered for display - NEVER fall back to other months!
        const displayListToUse = monthFiltered;

        const seenIds = new Set<string>();
        const displayList: any[] = [];
        displayListToUse.forEach((exp, idx) => {
          const isRefundCat = exp.category === 'Sales Refund' || exp.category === 'Return Sales' || String(exp.id || '').startsWith('converted-refund-');
          let uId = exp.id ? String(exp.id) : `exp-item-${idx}-${exp.amount}`;
          if (isRefundCat) {
            const sRef = exp.sale_id || (String(exp.id || '').startsWith('converted-refund-') ? String(exp.id).replace('converted-refund-', '') : '');
            const dStr = (exp.expense_date || exp.date || exp.created_at || '').substring(0, 10);
            const sStaff = (exp.staff_name || exp.logged_by_name || exp.staff_id || '').toUpperCase();
            uId = sRef ? `refund-ref-${sRef}` : `refund-sig-${dStr}-${Number(exp.amount)}-${sStaff}`;
          }

          if (!seenIds.has(uId)) {
            seenIds.add(uId);
            displayList.push(exp);
          }
        });

        const parseTimeSafe = (obj: any) => {
          if (!obj) return 0;
          const val = obj.created_at || obj.expense_date || obj.date;
          if (!val) return 0;
          const isoStr = String(val).replace(' ', 'T');
          const t = new Date(isoStr).getTime();
          return isNaN(t) ? 0 : t;
        };

        // Strict Descending / Top-First Sorting:
        // 1. Newly logged local transient items (id starting with exp- or refund-) -> Rank #1 (Index 0 at top)
        // 2. Creation / Expense timestamp descending
        // 3. String / Primary ID descending
        displayList.sort((a, b) => {
          const isTransientA = String(a.id || '').startsWith('exp-') || String(a.id || '').startsWith('refund-');
          const isTransientB = String(b.id || '').startsWith('exp-') || String(b.id || '').startsWith('refund-');
          if (isTransientA && !isTransientB) return -1;
          if (!isTransientA && isTransientB) return 1;

          const timeA = parseTimeSafe(a);
          const timeB = parseTimeSafe(b);
          if (timeA !== timeB) return timeB - timeA;

          return String(b.id || '').localeCompare(String(a.id || ''));
        });

        console.log('DEBUG ExpenseHistoryTab Render displayList:', displayList);

        const totalExpensesSum = displayList.reduce((sum, exp) => sum + (Number(exp?.amount) || 0), 0);

        return (
          <section className="space-y-6 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight uppercase">Expense History</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Company Owner Log ({selectedMonth || 'All'})</p>
                </div>
              </div>

              {/* Total Expenses Summary Card */}
              <Card variant="glass" className="p-4 border-rose-500/20 min-w-[220px] flex items-center justify-between bg-slate-900/60">
                <div>
                  <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block">Total Expenses</span>
                  <p className="text-lg font-black text-rose-400 mt-0.5">{formatCurrency(totalExpensesSum)}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-white/5">
                  {displayList.length} Items
                </span>
              </Card>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20 mt-4">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                  {displayList.length > 0 ? (
                    displayList.map((exp: any, idx: number) => (
                      <tr key={exp.id || idx} className="hover:bg-slate-900/10">
                        <td className="py-3 px-4 text-slate-400 font-medium">{formatDateSafe(exp.expense_date || exp.created_at)}</td>
                        <td className="py-3 px-4 font-bold text-rose-400"><Badge variant="error">{exp.category || 'General'}</Badge></td>
                        <td className="py-3 px-4 text-slate-300 max-w-sm truncate">{exp.description || '-'}</td>
                        <td className="py-3 px-4 text-right text-rose-400 font-extrabold">{formatCurrency(exp.amount || 0)}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditingExpense(exp)}
                              className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-white transition-all cursor-pointer"
                              title="Edit Expense"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp)}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-white transition-all cursor-pointer"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500 font-bold">No expenses logged for this month.</td>
                    </tr>
                  )}
                </tbody>
                {displayList.length > 0 && (
                  <tfoot className="border-t-2 border-white/10 bg-slate-950/80 font-black text-xs">
                    <tr>
                      <td colSpan={3} className="py-3.5 px-4 text-right text-slate-400 uppercase tracking-wider">
                        Total Expenses:
                      </td>
                      <td className="py-3.5 px-4 text-right text-rose-400 font-black text-sm">
                        {formatCurrency(totalExpensesSum)}
                      </td>
                      <td className="py-3.5 px-4"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>
        );
      })()}
    </>
  );
  } catch (err: any) {
    console.error('ExpenseHistoryTab Render Error:', err);
    return (
      <div className="p-6 bg-slate-900/80 rounded-2xl border border-rose-500/20 text-center space-y-2">
        <h3 className="text-sm font-bold text-rose-400">Expense History Render Notice</h3>
        <p className="text-xs text-slate-400">Unable to display expense entries cleanly: {err?.message || 'Unknown error'}</p>
      </div>
    );
  }
};
