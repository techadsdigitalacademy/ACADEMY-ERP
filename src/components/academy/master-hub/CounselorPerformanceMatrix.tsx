import React from 'react';
import { Card } from '../../Card';
import { Badge } from '../../Badge';
import { formatCurrency } from '../../../services/mockData';
import type { AcademyCounselorMetric } from '../../../services/academyMetricsService';
import {
  Users,
  Award,
  ArrowUpRight,
  Settings2
} from 'lucide-react';

interface CounselorPerformanceMatrixProps {
  counselorMetrics: AcademyCounselorMetric[];
  isAdmin: boolean;
  onOpenTargetModal: () => void;
  onNavigateToReports: (counselorId?: string) => void;
}

export const CounselorPerformanceMatrix: React.FC<CounselorPerformanceMatrixProps> = ({
  counselorMetrics,
  isAdmin,
  onOpenTargetModal,
  onNavigateToReports
}) => {
  return (
    <Card variant="glass" className="p-5 border-border space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary-soft text-primary rounded-lg">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Academy Counselor Intake & Revenue
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Student admission velocity, monthly targets & revenue attribution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {isAdmin && (
            <button
              onClick={onOpenTargetModal}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-muted hover:bg-muted-2 text-foreground border border-border flex items-center gap-1 cursor-pointer transition-all"
            >
              <Settings2 className="w-3 h-3 text-primary" />
              <span>Configure Targets</span>
            </button>
          )}

          <button
            onClick={() => onNavigateToReports()}
            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>Detailed Reports</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Table of Counselors */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase text-muted-foreground border-b border-border bg-muted/30">
            <tr>
              <th className="py-2.5 px-3">Counselor</th>
              <th className="py-2.5 px-3">Admissions / Target</th>
              <th className="py-2.5 px-3 text-center">Achievement</th>
              <th className="py-2.5 px-3 text-right">Gross Booked</th>
              <th className="py-2.5 px-3 text-right">Cash Realized</th>
              <th className="py-2.5 px-3 text-right">Pending Dues</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {counselorMetrics.map((c, idx) => {
              const isOverachieved = c.achievement_rate >= 100;
              const isOnTrack = c.achievement_rate >= 70;
              const progressColor = isOverachieved
                ? 'bg-emerald-500'
                : isOnTrack
                ? 'bg-primary'
                : 'bg-amber-500';

              return (
                <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-soft text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <span className="font-bold text-foreground block">{c.counselor_name}</span>
                        <span className="text-[9px] text-muted-foreground">Academy Counselor</span>
                      </div>
                    </div>
                  </td>

                  {/* Target & Progress */}
                  <td className="py-3 px-3">
                    <div className="space-y-1 w-32">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <strong className="text-foreground">{c.admissions_count}</strong>
                        <span className="text-muted-foreground">/ {c.target_admissions} goal</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                          style={{ width: `${Math.min(100, c.achievement_rate)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Achievement Badge */}
                  <td className="py-3 px-3 text-center">
                    <Badge
                      variant={isOverachieved ? 'success' : isOnTrack ? 'indigo' : 'warning'}
                      className="text-[9px] py-0 px-2 font-bold inline-flex items-center gap-1"
                    >
                      {isOverachieved && <Award className="w-2.5 h-2.5" />}
                      <span>{c.achievement_rate}%</span>
                    </Badge>
                  </td>

                  {/* Gross Booked */}
                  <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                    {formatCurrency(c.total_fees_booked)}
                  </td>

                  {/* Cash Realized */}
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                    {formatCurrency(c.upfront_cash_collected)}
                  </td>

                  {/* Pending */}
                  <td className="py-3 px-3 text-right font-mono font-medium text-amber-400">
                    {formatCurrency(c.pending_collections)}
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onNavigateToReports(c.id)}
                      className="px-2.5 py-1 rounded text-[10px] font-bold bg-muted hover:bg-muted-2 text-foreground border border-border inline-flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <span>Report</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {counselorMetrics.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                  No counselors found in staff directory.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
