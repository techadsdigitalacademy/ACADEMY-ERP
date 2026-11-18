import React, { useState } from 'react';
import { Card } from '../../Card';
import { Badge } from '../../Badge';
import { formatCurrency } from '../../../services/mockData';
import type {
  AcademyFinancialAnalytics,
  AcademyBatchMetric
} from '../../../services/academyMetricsService';
import {
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  BarChart3,
  Calendar
} from 'lucide-react';

interface FinancialYieldAnalyticsProps {
  financials: AcademyFinancialAnalytics;
  batchMetrics: AcademyBatchMetric[];
  onNavigateToFinances: () => void;
  onNavigateToStudentHubWithFilter?: (filterType: 'cleared' | 'in_progress' | 'critical') => void;
}

export const FinancialYieldAnalytics: React.FC<FinancialYieldAnalyticsProps> = ({
  financials,
  batchMetrics,
  onNavigateToFinances,
  onNavigateToStudentHubWithFilter
}) => {
  const [activeTab, setActiveTab] = useState<'aging' | 'batches'>('aging');

  const maxMonthAmt = Math.max(
    ...financials.monthly_trend.map(m => m.amount),
    1
  );

  return (
    <div className="space-y-6">
      {/* 3 Fee Aging & Risk Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tier 1: 100% Cleared */}
        <Card
          variant="glass"
          className="p-4 border-emerald-500/20 bg-emerald-500/5 space-y-3 cursor-pointer hover:border-emerald-500/40 transition-all"
          onClick={() => onNavigateToStudentHubWithFilter?.('cleared')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              100% Cleared in Full
            </span>
            <Badge variant="success" className="text-[9px] py-0 px-1.5 font-bold">
              {financials.fee_aging.cleared.count} Students
            </Badge>
          </div>

          <div>
            <div className="text-xl font-black text-foreground">
              {formatCurrency(financials.fee_aging.cleared.paid_fees)}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">
              Zero pending dues. All installments fulfilled.
            </p>
          </div>

          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-full" />
          </div>
        </Card>

        {/* Tier 2: 50% - 99% Partial */}
        <Card
          variant="glass"
          className="p-4 border-primary/20 bg-primary-soft/10 space-y-3 cursor-pointer hover:border-primary/40 transition-all"
          onClick={() => onNavigateToStudentHubWithFilter?.('in_progress')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Active Installments (50-99%)
            </span>
            <Badge variant="indigo" className="text-[9px] py-0 px-1.5 font-bold text-primary border-primary/30">
              {financials.fee_aging.in_progress.count} Students
            </Badge>
          </div>

          <div>
            <div className="text-xl font-black text-foreground">
              {formatCurrency(financials.fee_aging.in_progress.paid_fees)}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1 flex items-center justify-between">
              <span>Collected</span>
              <span className="text-amber-400 font-bold">
                {formatCurrency(financials.fee_aging.in_progress.pending_fees)} Dues
              </span>
            </p>
          </div>

          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full w-3/4" />
          </div>
        </Card>

        {/* Tier 3: < 50% Critical Dues */}
        <Card
          variant="glass"
          className="p-4 border-amber-500/20 bg-amber-500/5 space-y-3 cursor-pointer hover:border-amber-500/40 transition-all"
          onClick={() => onNavigateToStudentHubWithFilter?.('critical')}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Initial Token / Dues (&lt; 50%)
            </span>
            <Badge variant="warning" className="text-[9px] py-0 px-1.5 font-bold">
              {financials.fee_aging.critical.count} Students
            </Badge>
          </div>

          <div>
            <div className="text-xl font-black text-amber-400">
              {formatCurrency(financials.fee_aging.critical.pending_fees)}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium mt-1 flex items-center justify-between">
              <span>Outstanding Dues</span>
              <span className="text-emerald-400 font-bold">
                {formatCurrency(financials.fee_aging.critical.paid_fees)} Paid
              </span>
            </p>
          </div>

          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full w-1/4" />
          </div>
        </Card>
      </div>

      {/* Analytics Main Grid: Monthly Collections Trend + Payment Method Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Collections Trend or Batch Yield Table */}
        <Card variant="glass" className="lg:col-span-2 p-5 border-border space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Revenue Realization & Batch Yields
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Collection timelines and batch-by-batch fee recovery
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="inline-flex rounded-lg bg-muted p-0.5 border border-border text-[10px] font-bold">
                <button
                  onClick={() => setActiveTab('aging')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    activeTab === 'aging'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Monthly Trend
                </button>
                <button
                  onClick={() => setActiveTab('batches')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    activeTab === 'batches'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Batch Yields ({batchMetrics.length})
                </button>
              </div>

              <button
                onClick={onNavigateToFinances}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>Finances</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {activeTab === 'aging' ? (
            <div className="space-y-4 pt-2">
              {/* Monthly Bars Visualizer */}
              <div className="space-y-3">
                {financials.monthly_trend.map((m, idx) => {
                  const widthPercent = Math.max(5, Math.round((m.amount / maxMonthAmt) * 100));
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-foreground flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span>{m.month}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {m.count} payments
                          </span>
                          <span className="text-emerald-400 font-extrabold font-mono">
                            {formatCurrency(m.amount)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {financials.monthly_trend.length === 0 && (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    No payment history recorded yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase text-muted-foreground border-b border-border bg-muted/30 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Batch Name</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3 text-right">Expected</th>
                    <th className="py-2.5 px-3 text-right">Collected</th>
                    <th className="py-2.5 px-3 text-right">Pending</th>
                    <th className="py-2.5 px-3 text-center">Recovery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {batchMetrics.map(b => (
                    <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-foreground">
                        {b.batch_name}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                        {b.course_name}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                        {formatCurrency(b.total_fees)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(b.total_collected)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-amber-400">
                        {formatCurrency(b.total_pending)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant={b.collection_rate >= 75 ? 'success' : b.collection_rate >= 40 ? 'warning' : 'info'}
                          className="text-[9px] py-0 px-1.5 font-bold"
                        >
                          {b.collection_rate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {batchMetrics.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                        No batch financial records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Right 1 Col: Payment Methods Breakdown */}
        <Card variant="glass" className="p-5 border-border space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary-soft text-primary rounded-lg">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Payment Methods
                  </h3>
                  <p className="text-[10px] text-muted-foreground">Collection channels & volume</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {financials.payment_methods.map((pm, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-border bg-card/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">
                      {pm.name}
                    </span>
                    <Badge variant="info" className="text-[9px] py-0">
                      {pm.count} {pm.count === 1 ? 'Txn' : 'Txns'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                    <span className="font-mono text-emerald-400 font-bold">
                      {formatCurrency(pm.amount)}
                    </span>
                    <span className="font-bold text-foreground">
                      {pm.percentage}% of total
                    </span>
                  </div>

                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${pm.percentage}%` }}
                    />
                  </div>
                </div>
              ))}

              {financials.payment_methods.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No fee collection transactions recorded.
                </div>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-muted-foreground flex items-center justify-between mt-4">
            <span>Overall Collection Efficiency</span>
            <strong className="text-emerald-400 text-xs font-black">
              {financials.recovery_rate}%
            </strong>
          </div>
        </Card>
      </div>
    </div>
  );
};
