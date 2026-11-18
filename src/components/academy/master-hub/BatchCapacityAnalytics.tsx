import React, { useState } from 'react';
import { Card } from '../../Card';
import { Badge } from '../../Badge';
import { formatCurrency } from '../../../services/mockData';
import type { AcademyBatchMetric } from '../../../services/academyMetricsService';
import {
  Layers,
  Users,
  UserPlus,
  ArrowUpRight,
  Monitor,
  Building2,
  Calendar,
  GraduationCap,
  Sparkles,
  PieChart
} from 'lucide-react';

interface BatchCapacityAnalyticsProps {
  batches: AcademyBatchMetric[];
  courseStats: { course: string; count: number; students: number; revenue: number }[];
  onNavigateToBatches: () => void;
  onNavigateToStudents: (batchId?: string) => void;
  onEnrollInBatch: (batch: AcademyBatchMetric) => void;
}

export const BatchCapacityAnalytics: React.FC<BatchCapacityAnalyticsProps> = ({
  batches,
  courseStats,
  onNavigateToBatches,
  onNavigateToStudents,
  onEnrollInBatch
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'upcoming'>('all');

  const filteredBatches = batches.filter(b => {
    if (statusFilter === 'running') return b.status === 'Running';
    if (statusFilter === 'upcoming') return b.status === 'Upcoming';
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Cols: Batches Occupancy Grid */}
      <Card variant="glass" className="lg:col-span-2 p-5 border-border space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary-soft text-primary rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Batch Capacity & Seat Occupancy
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Live seat inventory across active and upcoming classroom batches
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="inline-flex rounded-lg bg-muted p-0.5 border border-border text-[10px] font-bold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({batches.length})
              </button>
              <button
                onClick={() => setStatusFilter('running')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === 'running'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Running
              </button>
              <button
                onClick={() => setStatusFilter('upcoming')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === 'upcoming'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Upcoming
              </button>
            </div>

            <button
              onClick={onNavigateToBatches}
              className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>Manage</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Batches Grid */}
        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
          {filteredBatches.map(b => {
            const isRunning = b.status === 'Running';
            const isFull = b.remaining_seats <= 0;
            const occupancyColor =
              b.occupancy_rate >= 80
                ? 'bg-emerald-500'
                : b.occupancy_rate >= 50
                ? 'bg-primary'
                : 'bg-amber-500';

            return (
              <div
                key={b.id}
                className="p-3.5 rounded-xl border border-border bg-card/60 hover:bg-card hover:border-primary/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-foreground truncate">{b.batch_name}</span>
                    <Badge
                      variant={isRunning ? 'success' : 'warning'}
                      className="text-[9px] py-0 px-1.5 font-bold uppercase"
                    >
                      {b.status}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border font-medium">
                      {b.mode === 'Online' ? <Monitor className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                      <span>{b.mode}</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">({b.batch_code})</span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-primary" />
                      <span className="font-medium text-foreground">{b.course_name}</span>
                    </span>
                    <span>•</span>
                    <span>Faculty: <strong className="text-foreground">{b.tutor_name}</strong></span>
                    {b.start_date && b.start_date !== '-' && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>Starts {b.start_date}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Seat Occupancy Progress Bar */}
                  <div className="space-y-1 pt-1 max-w-md">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground font-medium">
                        Occupancy: <strong className="text-foreground">{b.occupancy_rate}%</strong>
                      </span>
                      <span className="font-mono text-muted-foreground">
                        <strong className="text-foreground">{b.enrolled_count}</strong> / {b.total_seats} seats
                        ({b.remaining_seats} left)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${occupancyColor}`}
                        style={{ width: `${Math.min(100, b.occupancy_rate)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => onNavigateToStudents(b.id)}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-muted hover:bg-muted-2 text-foreground border border-border flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span>Students ({b.enrolled_count})</span>
                  </button>

                  <button
                    onClick={() => onEnrollInBatch(b)}
                    disabled={isFull}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs ${
                      isFull
                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>{isFull ? 'Batch Full' : 'Enroll'}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {filteredBatches.length === 0 && (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              No batches found for selected filter.
            </div>
          )}
        </div>
      </Card>

      {/* Right 1 Col: Course Streams & Breakdown */}
      <Card variant="glass" className="p-5 border-border space-y-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Program Distribution
                </h3>
                <p className="text-[10px] text-muted-foreground">Students by course stream</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {courseStats.slice(0, 5).map((cs, idx) => {
              const totalStreamStudents = courseStats.reduce((a, b) => a + b.students, 0);
              const percent = totalStreamStudents > 0
                ? Math.round((cs.students / totalStreamStudents) * 100)
                : 0;

              return (
                <div key={idx} className="p-3 rounded-xl border border-border bg-card/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground truncate max-w-[160px]">
                      {cs.course}
                    </span>
                    <Badge variant="info" className="text-[9px] py-0">
                      {cs.count} {cs.count === 1 ? 'Batch' : 'Batches'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                    <span>
                      <strong className="text-foreground">{cs.students}</strong> Students ({percent}%)
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {formatCurrency(cs.revenue)}
                    </span>
                  </div>

                  <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {courseStats.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No course data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Quick hint box */}
        <div className="p-3 rounded-xl bg-primary-soft/10 border border-primary/20 text-[10px] text-muted-foreground flex items-center gap-2 mt-4">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Occupancy metrics sync live with new student admissions and fee updates.</span>
        </div>
      </Card>
    </div>
  );
};
