import React, { useState, useMemo } from 'react';
import { Briefcase, Search, Edit2, Trash2, Download, FileText } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { formatCurrency } from '../services/mockData';

interface SalesHistoryLogProps {
  sales: any[];
  targetAmount: number;
  isAdmin?: boolean;
  hideTargetProgress?: boolean;
  onEdit?: (sale: any) => void;
  onDelete?: (sale: any) => void;
  onViewSlip?: (sale: any) => void;
}

export const SalesHistoryLog: React.FC<SalesHistoryLogProps> = ({
  sales,
  targetAmount,
  isAdmin = false,
  hideTargetProgress = false,
  onEdit,
  onDelete,
  onViewSlip
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Full' | 'Advance' | 'Clearance' | 'Refund'>('All');

  const filteredSales = useMemo(() => {
    const list = (sales || []).filter(s => {
      const matchesSearch = !searchQuery ? true : (
        s.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.service_package?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.package_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.payment_type?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const matchesFilter = activeFilter === 'All' ? true : s.payment_type === activeFilter;
      return matchesSearch && matchesFilter;
    });

    const getTimestamp = (item: any) => {
      if (item.created_at) {
        const t = new Date(item.created_at).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (item.date) {
        const t = new Date(item.date).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (item.sale_date) {
        const t = new Date(item.sale_date).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      return 0;
    };

    return [...list].sort((a, b) => {
      // 1. Prioritize newly logged local transient entries so they render at index 0 immediately
      const isNewLocalA = typeof a.id === 'string' && (a.id.startsWith('refund-') || a.id.startsWith('sale-') || a.id.startsWith('temp-'));
      const isNewLocalB = typeof b.id === 'string' && (b.id.startsWith('refund-') || b.id.startsWith('sale-') || b.id.startsWith('temp-'));
      if (isNewLocalA && !isNewLocalB) return -1;
      if (!isNewLocalA && isNewLocalB) return 1;

      // 2. Work SL (Work Serial Number) descending
      const slA = Number(String(a.work_sl || '').replace(/\D/g, ''));
      const slB = Number(String(b.work_sl || '').replace(/\D/g, ''));
      if (!isNaN(slA) && !isNaN(slB) && slA > 0 && slB > 0 && slA !== slB) {
        return slB - slA;
      }

      // 3. Timestamp sorting (created_at descending)
      const timeA = getTimestamp(a);
      const timeB = getTimestamp(b);
      if (timeA !== timeB) return timeB - timeA;

      // 4. Numeric auto-increment ID sorting (newest database record first)
      const numIdA = Number(a.id);
      const numIdB = Number(b.id);
      if (!isNaN(numIdA) && !isNaN(numIdB) && numIdA > 0 && numIdB > 0) {
        if (numIdA !== numIdB) return numIdB - numIdA;
      }

      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [sales, searchQuery, activeFilter]);

  // Pre-calculate dynamic serial numbers for non-clearance & non-refund entries
  const serialMap = useMemo(() => {
    const map = new Map<string | number, number>();
    const nonClearanceEntries = filteredSales.filter(s => {
      const isRefund = s.payment_type === 'Refund';
      const isClearance = s.payment_type === 'Clearance' || (s.package_amount === 0 && s.received_amount > 0 && !isRefund);
      return !isClearance && !isRefund;
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
      const isRefund = sale.payment_type === 'Refund';
      const isClearance = sale.payment_type === 'Clearance' || (sale.package_amount === 0 && sale.received_amount > 0 && !isRefund);
      
      if (isRefund) {
        acc.totalRefund += (sale.received_amount || 0);
      } else if (!isClearance) {
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
      totalRefund: 0,
      validWorksCount: 0
    });
  };

  const totals = getSalesTotals(filteredSales);
  const combinedReceived = totals.totalRec + totals.totalClearing - totals.totalRefund;
  const targetPercent = targetAmount > 0 ? Math.min(100, Math.round((combinedReceived / targetAmount) * 100)) : 0;

  const handleExportExcel = () => {
    try {
      const csvRows = [];
      csvRows.push(['Sales History Log']);
      csvRows.push(['Work SL', 'Date', 'Company Name', 'Package', 'Payment Method', 'Package Cost (INR)', 'Type', 'Received Amount (INR)', 'Balance Amount (INR)']);

      filteredSales.forEach((sale, index) => {
        const isRefund = sale.payment_type === 'Refund';
        const isClearance = sale.payment_type === 'Clearance' || (sale.package_amount === 0 && sale.received_amount > 0 && !isRefund);
        const balance = (isClearance || isRefund) ? 0 : Math.max(0, (sale.package_amount || 0) - (sale.received_amount || 0));
        const dateStr = sale.created_at 
          ? new Date(sale.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) 
          : (sale.date || sale.sale_date || sale.sale_month || '');

        let displaySl: string | number = '-';
        if (sale.work_sl) {
          displaySl = String(sale.work_sl).replace(/^#/, '');
        } else if (!isClearance && !isRefund) {
          displaySl = serialMap.get(sale.id) || (filteredSales.length - index);
        }

        csvRows.push([
          displaySl,
          dateStr,
          sale.client_name || '-',
          sale.service_package || sale.package_name || '-',
          sale.payment_method || 'Bank Transfer',
          (isClearance || isRefund) ? '-' : (sale.package_amount || 0),
          isRefund ? 'Refund' : sale.payment_type,
          sale.received_amount || 0,
          balance
        ]);
      });

      csvRows.push([]);
      csvRows.push(['SUMMARY TOTALS']);
      csvRows.push(['Total Package Cost', totals.totalPackageAmt]);
      csvRows.push(['Net Received Total', combinedReceived]);
      csvRows.push(['Total Refunded', totals.totalRefund]);
      csvRows.push(['Total Balance Due', totals.totalBal]);

      const BOM = "\uFEFF";
      const csvContent = BOM + csvRows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Sales_History_Log_${new Date().toISOString().substring(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to export Sales Log: ' + err);
    }
  };

  const handleExportPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
      }

      const rowsHtml = filteredSales.map((sale, index) => {
        const isRefund = sale.payment_type === 'Refund';
        const isClearance = sale.payment_type === 'Clearance' || (sale.package_amount === 0 && sale.received_amount > 0 && !isRefund);
        const balance = (isClearance || isRefund) ? 0 : Math.max(0, (sale.package_amount || 0) - (sale.received_amount || 0));
        const dateStr = sale.created_at 
          ? new Date(sale.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) 
          : (sale.date || sale.sale_date || sale.sale_month || '');

        let displaySl: string | number = '-';
        if (sale.work_sl) {
          displaySl = String(sale.work_sl).replace(/^#/, '');
        } else if (!isClearance && !isRefund) {
          displaySl = serialMap.get(sale.id) || (filteredSales.length - index);
        }

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px; font-weight: bold;">${displaySl}</td>
            <td style="padding: 8px;">${dateStr}</td>
            <td style="padding: 8px; font-weight: bold;">${sale.client_name || '-'}</td>
            <td style="padding: 8px;">${sale.service_package || sale.package_name || '-'}</td>
            <td style="padding: 8px;">${sale.payment_method || 'Bank Transfer'}</td>
            <td style="padding: 8px; text-align: right;">${(isClearance || isRefund) ? '-' : '₹' + (sale.package_amount || 0).toLocaleString()}</td>
            <td style="padding: 8px; text-align: center;">${isRefund ? 'Refund' : sale.payment_type}</td>
            <td style="padding: 8px; text-align: right; font-weight: bold; color: ${isRefund ? '#e11d48' : '#059669'};">₹${(sale.received_amount || 0).toLocaleString()}</td>
            <td style="padding: 8px; text-align: right; font-weight: bold; color: ${balance > 0 ? '#d97706' : '#64748b'};">₹${balance.toLocaleString()}</td>
          </tr>
        `;
      }).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Sales History Log Report</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #0f172a; }
              h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
              p { font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 16px; }
              .metrics { display: flex; gap: 16px; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
              .metric-item { flex: 1; }
              .metric-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
              .metric-val { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
              th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
              th.right { text-align: right; }
              th.center { text-align: center; }
            </style>
          </head>
          <body>
            <h1>Tech Ads ERP - Sales History Log</h1>
            <p>Generated on ${new Date().toLocaleString()} &bull; Total Records: ${filteredSales.length}</p>
            
            <div class="metrics">
              <div class="metric-item">
                <div class="metric-label">Total Package Cost</div>
                <div class="metric-val">₹${totals.totalPackageAmt.toLocaleString()}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Net Received Total</div>
                <div class="metric-val" style="color: #059669;">₹${combinedReceived.toLocaleString()}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Total Refunded</div>
                <div class="metric-val" style="color: #e11d48;">₹${totals.totalRefund.toLocaleString()}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Total Balance Due</div>
                <div class="metric-val" style="color: #d97706;">₹${totals.totalBal.toLocaleString()}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Work SL</th>
                  <th>Date</th>
                  <th>Company Name</th>
                  <th>Package</th>
                  <th>Payment Method</th>
                  <th class="right">Cost</th>
                  <th class="center">Type</th>
                  <th class="right">Received</th>
                  <th class="right">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      alert('Failed to generate PDF: ' + err);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {!isAdmin && (
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-extrabold text-foreground flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            My Sales History Log (Read-Only)
          </h2>
          <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-lg border border-border font-bold">
            {filteredSales.length} Records
          </span>
        </div>
      )}

      {/* Top Overview Metric Cards */}
      {!hideTargetProgress && (
        <div className="space-y-4">
          <Card variant="glass" glowColor="purple" className="p-4 flex flex-col justify-between border-primary/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Target Goal Summary</p>
                <p className="text-xs font-semibold text-secondary-foreground mt-1">
                  Target: <span className="text-foreground font-extrabold">{targetAmount > 0 ? formatCurrency(targetAmount) : 'Not Set'}</span> &bull; 
                  Collected: <span className="text-success font-extrabold">{formatCurrency(combinedReceived)}</span> &bull; 
                  Remaining: <span className="text-warning font-extrabold">{targetAmount <= 0 ? '-' : combinedReceived >= targetAmount ? 'Target Achieved!' : formatCurrency(targetAmount - combinedReceived)}</span>
                </p>
              </div>
              <span className="text-xs font-black text-primary bg-primary-soft px-2.5 py-1 rounded-lg border border-primary/20 self-start sm:self-center shrink-0">
                {targetPercent}% Achieved
              </span>
            </div>
            <div className="w-full bg-card/80 rounded-full h-2.5 mt-3 overflow-hidden border border-border p-0.5">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-500" 
                style={{ width: `${targetPercent}%` }}
              ></div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card variant="glass" glowColor="indigo" className="p-4 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Package Cost</p>
                <h3 className="text-xl font-black text-foreground mt-1">{formatCurrency(totals.totalPackageAmt)}</h3>
              </div>
              <span className="text-[10px] font-bold text-primary mt-2 block">{totals.validWorksCount} Works Logged</span>
            </Card>

            <Card variant="glass" glowColor="emerald" className="p-4 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Net Received Total</p>
                <h3 className="text-xl font-black text-success mt-1">{formatCurrency(combinedReceived)}</h3>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium mt-2 block">
                Rec: {formatCurrency(totals.totalRec)} | Clear: {formatCurrency(totals.totalClearing)}
              </span>
            </Card>

            <Card variant="glass" className="p-4 flex flex-col justify-between border-danger/20 bg-danger-soft">
              <div>
                <p className="text-[10px] font-bold text-danger uppercase tracking-wider">Total Refunded</p>
                <h3 className="text-xl font-black text-danger mt-1">{formatCurrency(totals.totalRefund)}</h3>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium mt-2 block">Deducted from Received Total</span>
            </Card>

            <Card variant="glass" className="p-4 flex flex-col justify-between border-warning/20 bg-warning-soft">
              <div>
                <p className="text-[10px] font-bold text-warning uppercase tracking-wider">Total Balance Due</p>
                <h3 className="text-xl font-black text-warning mt-1">{formatCurrency(totals.totalBal)}</h3>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium mt-2 block">Outstanding Balances</span>
            </Card>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <Card variant="glass" className="p-0 overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search client or package..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted-2 border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 md:pb-0">
            {isAdmin && (
              <div className="flex items-center gap-1.5 border-r border-border pr-2 mr-1">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-soft hover:bg-success-soft text-success border border-success/30 text-xs font-extrabold transition-all cursor-pointer shadow-sm whitespace-nowrap"
                  title="Export Sales Log to Excel / CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger-soft hover:bg-danger-soft text-danger border border-danger/30 text-xs font-extrabold transition-all cursor-pointer shadow-sm whitespace-nowrap"
                  title="Export Sales Log to PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>
              </div>
            )}

            {(['All', 'Full', 'Advance', 'Clearance', 'Refund'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
 activeFilter === filter
 ? filter === 'Refund' 
 ? 'bg-danger text-foreground '
 : 'bg-primary text-foreground '
 : 'bg-muted-2 text-muted-foreground hover:text-white border border-border'
 }`}
              >
                {filter === 'All' ? 'ALL' : filter.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted-2 text-muted-foreground font-bold uppercase text-[9.5px] tracking-wider border-b border-border">
              <tr>
                <th className="py-3 px-4">WORK SL</th>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">COMPANY NAME</th>
                <th className="py-3 px-4">PACKAGE</th>
                <th className="py-3 px-4">PAYMENT METHOD</th>
                <th className="py-3 px-4 text-right">PACKAGE COST</th>
                <th className="py-3 px-4 text-center">TYPE</th>
                <th className="py-3 px-4 text-right">RECEIVED AMOUNT</th>
                <th className="py-3 px-4 text-right">BALANCE AMOUNT</th>
                <th className="py-3 px-4 text-right">BALANCE CLEARING</th>
                <th className="py-3 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-secondary-foreground font-semibold">
              {filteredSales?.map((sale, index) => {
                const isRefund = sale.payment_type === 'Refund';
                const isClearance = sale.payment_type === 'Clearance' || (sale.package_amount === 0 && sale.received_amount > 0 && !isRefund);
                const balance = (isClearance || isRefund) ? 0 : Math.max(0, (sale.package_amount || 0) - (sale.received_amount || 0));
                const dateStr = sale.created_at 
                  ? new Date(sale.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) 
                  : (sale.date || sale.sale_date || sale.sale_month || '');
                
                let displaySl: string | number = '-';
                if (sale.work_sl) {
                  displaySl = String(sale.work_sl).replace(/^#/, '');
                } else if (!isClearance && !isRefund) {
                  displaySl = serialMap.get(sale.id) || (filteredSales.length - index);
                }

                return (
                  <tr key={sale.id} className={isRefund ? "bg-danger-soft hover:bg-danger-soft" : "hover:bg-muted-2"}>
                    <td className="py-3 px-4 font-extrabold text-primary">{displaySl}</td>
                    <td className="py-3 px-4 text-muted-foreground">{dateStr}</td>
                    <td className="py-3 px-4 text-foreground font-bold">{sale.client_name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{sale.service_package || sale.package_name || '-'}</td>
                    <td className="py-3 px-4 text-muted-foreground">{sale.payment_method || 'Bank Transfer'}</td>
                    <td className="py-3 px-4 text-right">
                      {(isClearance || isRefund) ? '-' : formatCurrency(sale.package_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isRefund ? (
                        <span className="px-2.5 py-0.5 rounded-lg bg-danger-soft text-danger border border-danger/20 font-extrabold text-[10px]">
                          Refund
                        </span>
                      ) : (
                        <Badge variant={sale.payment_type === 'Full' ? 'success' : sale.payment_type === 'Advance' ? 'info' : 'purple'}>
                          {sale.payment_type}
                        </Badge>
                      )}
                    </td>
                    <td className={`py-3 px-4 text-right font-extrabold ${isRefund ? 'text-danger' : 'text-success'}`}>
                      {isRefund ? `- ${formatCurrency(sale.received_amount)}` : isClearance ? '-' : formatCurrency(sale.received_amount)}
                    </td>
                    <td className="py-3 px-4 text-right text-warning">
                      {(isClearance || isRefund) ? '-' : formatCurrency(balance)}
                    </td>
                    <td className="py-3 px-4 text-right text-primary">
                      {isClearance ? formatCurrency(sale.received_amount) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {onViewSlip && (
                          <Button 
                            variant="glass" 
                            size="sm" 
                            className="!py-1 !px-2 text-[10px] border-border"
                            onClick={() => onViewSlip(sale)}
                          >
                            View Slip
                          </Button>
                        )}
                        {isAdmin && onEdit && !isRefund && (
                          <Button
                            variant="glass"
                            size="sm"
                            className="!py-1 !px-2 text-[10px] border-border hover:text-primary"
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
                            className="!py-1 !px-2 text-[10px] border-border hover:text-danger hover:bg-danger-soft hover:border-danger/20"
                            onClick={() => onDelete(sale)}
                            title="Delete Transaction"
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
                  <td colSpan={11} className="text-center py-8 text-muted-foreground font-semibold">No sales recorded.</td>
                </tr>
              )}
            </tbody>
            {filteredSales.length > 0 && (
              <tfoot className="border-t border-border bg-muted-2 text-foreground font-extrabold">
                <tr>
                  <td className="py-3.5 px-4 text-left text-primary font-bold text-[9px] uppercase tracking-wider">
                    Total Works: {totals.validWorksCount}
                  </td>
                  <td colSpan={4} className="py-3.5 px-4 text-right uppercase tracking-wider text-[9px] text-muted-foreground">Totals:</td>
                  <td className="py-3.5 px-4 text-right">{formatCurrency(totals.totalPackageAmt)}</td>
                  <td></td>
                  <td className="py-3.5 px-4 text-right text-success">{formatCurrency(totals.totalRec)}</td>
                  <td className="py-3.5 px-4 text-right text-warning">{formatCurrency(totals.totalBal)}</td>
                  <td className="py-3.5 px-4 text-right text-primary">{formatCurrency(totals.totalClearing)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
};
