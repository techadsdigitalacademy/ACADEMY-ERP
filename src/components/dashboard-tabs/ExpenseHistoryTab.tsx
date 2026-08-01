import React from 'react';
import { Badge } from '../Badge';
import { Star, Award } from 'lucide-react';
import { formatCurrency } from '../../services/mockData';

interface ExpenseHistoryTabProps {
  activeTab: string;
  isOwner: boolean;
  computedMonthSales: any[];
  ownerExpenses: any[];
  selectedMonth: string;
}

export const ExpenseHistoryTab: React.FC<ExpenseHistoryTabProps> = ({
  activeTab,
  isOwner,
  computedMonthSales,
  ownerExpenses,
  selectedMonth
}) => {
  return (
    <>
      {/* EXPENSE HISTORY TAB MODULE - Sales History Log */}
      {activeTab === 'history' && isOwner && (
        <section className="space-y-6 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight uppercase">Sales History Log</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">All Staff Submissions</p>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Staff</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                {computedMonthSales.length > 0 ? computedMonthSales?.map((sale: any) => (
                  <tr key={sale.id} className="hover:bg-slate-900/10">
                    <td className="py-3 px-4">
                      {new Date(sale.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 flex items-center gap-2">
                      {sale.staff?.avatar_url && (
                         <img src={sale.staff.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                      )}
                      <span>{sale.staff?.full_name || 'Staff'}</span>
                    </td>
                    <td className="py-3 px-4">{sale.client_name}</td>
                    <td className="py-3 px-4"><Badge variant="info">{sale.project_name || 'Service'}</Badge></td>
                    <td className="py-3 px-4">
                      <Badge variant={sale.payment_type === 'Full' ? 'success' : sale.payment_type === 'Advance' ? 'warning' : 'info'}>
                        {sale.payment_type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(sale.received_amount)}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-500 font-bold">No sales logged this month.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* EXPENSE HISTORY TAB MODULE - Company Owner Expense Log */}
      {activeTab === 'expense_history' && (
        <section className="space-y-6 pt-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase">Expense History</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Company Owner Log</p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20 mt-6">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
                {ownerExpenses.length > 0 ? ownerExpenses?.filter(exp => exp.expense_date.startsWith(selectedMonth))?.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-900/10">
                    <td className="py-3 px-4">{new Date(exp.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="py-3 px-4"><Badge variant="info">{exp.category}</Badge></td>
                    <td className="py-3 px-4">{exp.description}</td>
                    <td className="py-3 px-4 text-right text-rose-400 font-bold">{formatCurrency(exp.amount)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-500 font-bold">No expenses logged yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
};
