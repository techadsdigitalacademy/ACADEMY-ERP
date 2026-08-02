import React, { useState, useMemo } from 'react';
import { Briefcase, Search, Edit2, Trash2 } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { formatCurrency } from '../services/mockData';

interface SalesHistoryLogProps {
  sales: any[];
  targetAmount: number;
  isAdmin?: boolean;
  onEdit?: (sale: any) => void;
  onDelete?: (sale: any) => void;
  onViewSlip?: (sale: any) => void;
}

export const SalesHistoryLog: React.FC<SalesHistoryLogProps> = ({
  sales,
  targetAmount,
  isAdmin = false,
  onEdit,
  onDelete,
  onViewSlip
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Full' | 'Advance' | 'Clearance'>('All');

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const matchesSearch = s.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.service_package?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'All' ? true : s.payment_type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [sales, searchQuery, activeFilter]);

  // Pre-calculate dynamic serial numbers for non-clearance entries (1 = oldest at bottom up to N = newest at top)
  const serialMap = useMemo(() => {
    const map = new Map<string | number, number>();
    const nonClearanceEntries = filteredSales.filter(s => {
      const isClearance = s.payment_type === 'Clearance' || (s.package_amount === 0 && s.received_amount > 0);
      return !isClearance;
    });

    let currentSl = 1;
    for (let i = nonClearanceEntries.length - 1; i >= 0; i--) {
      const entry = nonClearanceEntries[i];
      map.set(entry.id, currentSl++);
    }
    return map;
  }, [filteredSales]);

  const getSalesTotals = (salesList: any[]) => {
    return salesList.reduce((acc, sale) => {
      const isClearance = sale.payment_type === 'Clearance' || (sale.package_amount === 0 && sale.received_amount > 0);
      if (!isClearance) {
        acc.totalPackageAmt += (sale.package_amount || 0);
        acc.validWorksCount += 1;
        acc.totalBal += Math.max(0, (sale.package_amount || 0) - (sale.received_amount || 0));
        acc.totalRec += (sale.received_amount || 0);
      } else {
        acc.totalClearing += (sale.received_amount || 0);
      }
      return acc;
    }, {
      totalPackageAmt: 0,
      totalRec: 0,
      totalBal: 0,
      totalClearing: 0,
      validWorksCount: 0
    });
  };

  const totals = getSalesTotals(filteredSales);
  const combinedReceived = totals.totalRec + totals.totalClearing;
  const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((combinedReceived / targetAmount) * 100)) : 0;

  return (
    <div className="space-y-4 w-full">
      {!isAdmin && (
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            My Sales History Log (Read-Only)
          </h2>
          <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-bold">
            {filteredSales.length} Records
          </span>
        </div>
      )}

      {/* Top Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card variant="glass" className="p-3.5 border-white/5">
          <span className="text-[9px] font-bold text-slate-450 uppercase block tracking-wider">Total Package</span>
          <p className="text-sm font-extrabold text-white mt-1">{formatCurrency(totals.totalPackageAmt)}</p>
        </Card>
        <Card variant="glass" className="p-3.5 border-white/5">
          <span className="text-[9px] font-bold text-emerald-500 uppercase block tracking-wider">Total Received</span>
          <p className="text-sm font-extrabold text-emerald-400 mt-1">{formatCurrency(combinedReceived)}</p>
        </Card>
        <Card variant="glass" className="p-3.5 border-white/5">
          <span className="text-[9px] font-bold text-amber-500 uppercase block tracking-wider">Total Balance</span>
          <p className="text-sm font-extrabold text-amber-400 mt-1">{formatCurrency(totals.totalBal)}</p>
        </Card>
        <Card variant="glass" className="p-3.5 border-white/5 col-span-2 md:col-span-1">
          <span className="text-[9px] font-bold text-indigo-500 uppercase block tracking-wider">Target Progress</span>
          <p className="text-[10px] font-extrabold text-white mt-1.5 leading-none">
            {formatCurrency(combinedReceived)} / {formatCurrency(targetAmount)}
          </p>
          <div className="w-full bg-slate-950/80 rounded-full h-1 mt-2 overflow-hidden border border-white/5">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-300" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <span className="text-[8px] text-indigo-400 font-bold block mt-1">{progressPercent}% Achieved</span>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 mt-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search client or service package..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 items-center">
          {['All', 'Full', 'Advance', 'Clearance']?.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter as any)}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all duration-300 ${
                activeFilter === filter
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-900/60 border-white/5 text-slate-450 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/5 bg-slate-950/50 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Work SL</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Company Name</th>
              <th className="py-3 px-4">Package</th>
              <th className="py-3 px-4">Payment Method</th>
              <th className="py-3 px-4 text-right">Package Cost</th>
              <th className="py-3 px-4 text-center">Type</th>
              <th className="py-3 px-4 text-right">Received Amount</th>
              <th className="py-3 px-4 text-right">Balance Amount</th>
              <th className="py-3 px-4 text-right">Balance Clearing</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300 font-semibold">
            {filteredSales?.map((sale, index) => {
              const isClearance = sale.payment_type === 'Clearance' || (sale.package_amount === 0 && sale.received_amount > 0);
              const balance = isClearance ? 0 : Math.max(0, (sale.package_amount || 0) - (sale.received_amount || 0));
              const dateStr = sale.created_at ? sale.created_at.split('T')[0] : (sale.sale_month || '');
              
              let displaySl: string | number = '-';
              if (sale.work_sl) {
                displaySl = String(sale.work_sl).replace(/^#/, '');
              } else if (!isClearance) {
                displaySl = serialMap.get(sale.id) || (filteredSales.length - index);
              }

              return (
                <tr key={sale.id} className="hover:bg-slate-900/10">
                  <td className="py-3 px-4 font-extrabold text-indigo-400">{displaySl}</td>
                  <td className="py-3 px-4 text-slate-500">{dateStr}</td>
                  <td className="py-3 px-4 text-white font-bold">{sale.client_name}</td>
                  <td className="py-3 px-4 text-slate-400">{sale.service_package}</td>
                  <td className="py-3 px-4 text-slate-400">{sale.payment_method || 'Bank Transfer'}</td>
                  <td className="py-3 px-4 text-right">
                    {isClearance ? '-' : formatCurrency(sale.package_amount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={sale.payment_type === 'Full' ? 'success' : sale.payment_type === 'Advance' ? 'info' : 'purple'}>
                      {sale.payment_type}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400">
                    {isClearance ? '-' : formatCurrency(sale.received_amount)}
                  </td>
                  <td className="py-3 px-4 text-right text-amber-500">
                    {isClearance ? '-' : formatCurrency(balance)}
                  </td>
                  <td className="py-3 px-4 text-right text-purple-400">
                    {isClearance ? formatCurrency(sale.received_amount) : '-'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {onViewSlip && (
                        <Button 
                          variant="glass" 
                          size="sm" 
                          className="!py-1 !px-2 text-[10px] border-white/5"
                          onClick={() => onViewSlip(sale)}
                        >
                          View Slip
                        </Button>
                      )}
                      {isAdmin && onEdit && (
                        <Button
                          variant="glass"
                          size="sm"
                          className="!py-1 !px-2 text-[10px] border-white/5 hover:text-indigo-400"
                          onClick={() => onEdit(sale)}
                          title="Edit Sale Entry"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
                      {isAdmin && onDelete && (
                        <Button
                          variant="glass"
                          size="sm"
                          className="!py-1 !px-2 text-[10px] border-white/5 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20"
                          onClick={() => onDelete(sale)}
                          title="Delete Sale Entry"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center py-8 text-slate-600 font-semibold">No sales recorded.</td>
              </tr>
            )}
          </tbody>
          {filteredSales.length > 0 && (() => {
            return (
              <tfoot className="border-t border-white/10 bg-slate-950/40 text-white font-extrabold">
                <tr>
                  <td className="py-3.5 px-4 text-left text-indigo-400 font-bold text-[9px] uppercase tracking-wider">
                    Total Works: {totals.validWorksCount}
                  </td>
                  <td colSpan={4} className="py-3.5 px-4 text-right uppercase tracking-wider text-[9px] text-slate-400">Totals:</td>
                  <td className="py-3.5 px-4 text-right">{formatCurrency(totals.totalPackageAmt)}</td>
                  <td></td>
                  <td className="py-3.5 px-4 text-right text-emerald-400">{formatCurrency(totals.totalRec)}</td>
                  <td className="py-3.5 px-4 text-right text-amber-500">{formatCurrency(totals.totalBal)}</td>
                  <td className="py-3.5 px-4 text-right text-purple-400">{formatCurrency(totals.totalClearing)}</td>
                  <td></td>
                </tr>
              </tfoot>
            );
          })()}
        </table>
      </div>
    </div>
  );
};
