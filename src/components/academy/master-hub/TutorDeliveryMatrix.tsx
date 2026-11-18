import React from 'react';
import { Card } from '../../Card';
import { Badge } from '../../Badge';
import type { AcademyTutorMetric } from '../../../services/academyMetricsService';
import {
  GraduationCap,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface TutorDeliveryMatrixProps {
  tutorMetrics: AcademyTutorMetric[];
  onNavigateToAttendance: () => void;
  onNavigateToBatches?: () => void;
}

export const TutorDeliveryMatrix: React.FC<TutorDeliveryMatrixProps> = ({
  tutorMetrics,
  onNavigateToAttendance
}) => {
  return (
    <Card variant="glass" className="p-5 border-border space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Faculty & Tutor Academic Delivery
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Batches assigned, student retention & class attendance benchmarks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={onNavigateToAttendance}
            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>Attendance Portal</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Table of Tutors */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase text-muted-foreground border-b border-border bg-muted/30">
            <tr>
              <th className="py-2.5 px-3">Faculty / Tutor</th>
              <th className="py-2.5 px-3 text-center">Assigned Batches</th>
              <th className="py-2.5 px-3 text-center">Students Mentored</th>
              <th className="py-2.5 px-3">Class Attendance Rate</th>
              <th className="py-2.5 px-3 text-center">Benchmark</th>
              <th className="py-2.5 px-3 text-center">Student Retention</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tutorMetrics.map(t => {
              const meetsBenchmark = t.average_attendance_rate >= t.target_attendance_rate;
              const hasAttendanceData = t.total_classes_marked > 0;
              const progressColor = meetsBenchmark ? 'bg-emerald-500' : 'bg-amber-500';

              return (
                <tr key={t.id} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {t.tutor_name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-foreground block">{t.tutor_name}</span>
                        <span className="text-[9px] text-muted-foreground">Course Faculty</span>
                      </div>
                    </div>
                  </td>

                  {/* Batches count */}
                  <td className="py-3 px-3 text-center">
                    <Badge variant="info" className="text-[10px] py-0 px-2 font-mono font-bold">
                      {t.batches_count} {t.batches_count === 1 ? 'Batch' : 'Batches'}
                    </Badge>
                  </td>

                  {/* Students count */}
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono font-bold text-foreground text-xs">
                      {t.active_students_count}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1">students</span>
                  </td>

                  {/* Attendance Rate */}
                  <td className="py-3 px-3">
                    <div className="space-y-1 w-32">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <strong className="text-foreground">
                          {hasAttendanceData ? `${t.average_attendance_rate}%` : 'N/A'}
                        </strong>
                        <span className="text-[9px] text-muted-foreground">
                          ({t.total_classes_marked} records)
                        </span>
                      </div>
                      {hasAttendanceData && (
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                            style={{ width: `${Math.min(100, t.average_attendance_rate)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Benchmark Status */}
                  <td className="py-3 px-3 text-center">
                    {hasAttendanceData ? (
                      <Badge
                        variant={meetsBenchmark ? 'success' : 'warning'}
                        className="text-[9px] py-0 px-1.5 font-bold inline-flex items-center gap-1"
                      >
                        {meetsBenchmark ? (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        ) : (
                          <AlertTriangle className="w-2.5 h-2.5" />
                        )}
                        <span>{meetsBenchmark ? 'Meets Goal' : `Below ${t.target_attendance_rate}%`}</span>
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-mono">Pending sessions</span>
                    )}
                  </td>

                  {/* Retention Rate */}
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      {t.retention_rate}%
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={onNavigateToAttendance}
                      className="px-2.5 py-1 rounded text-[10px] font-bold bg-muted hover:bg-muted-2 text-foreground border border-border inline-flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <span>Attendance</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {tutorMetrics.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                  No tutors or faculty listed in staff profiles.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
