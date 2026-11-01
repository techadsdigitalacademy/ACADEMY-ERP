import React from 'react';
import { Clock, Calendar, CheckCircle2 } from 'lucide-react';

interface CourseTimelineTrackerProps {
  startDate?: string | null;
  durationDays?: number; // defaults to 90 days (3 months)
  className?: string;
}

export const CourseTimelineTracker: React.FC<CourseTimelineTrackerProps> = ({
  startDate,
  durationDays = 90,
  className = ''
}) => {
  if (!startDate) return null;

  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const elapsedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const remainingDays = Math.max(0, durationDays - elapsedDays);
  const progressPercent = Math.min(100, Math.max(2, Math.round((elapsedDays / durationDays) * 100)));
  const isCompleted = elapsedDays >= durationDays;

  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + durationDays);
  const endDateFormatted = endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const startDateFormatted = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className={`p-3 rounded-xl bg-card/70 border border-border space-y-2 shadow-sm ${className}`}>
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span>Course Timeline (3 Months / 90 Days)</span>
        </span>
        {isCompleted ? (
          <span className="text-purple-400 flex items-center gap-1 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Timeline Complete</span>
          </span>
        ) : (
          <span className="text-emerald-400 font-mono text-[11px]">
            {remainingDays} Days Left &bull; Day {elapsedDays} of {durationDays}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden relative">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isCompleted
              ? 'bg-purple-500'
              : progressPercent > 80
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Dates row */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-muted-foreground/70" />
          <span>Started: <strong className="text-foreground">{startDateFormatted}</strong></span>
        </span>
        <span>Target Completion: <strong className="text-foreground">{endDateFormatted}</strong></span>
      </div>
    </div>
  );
};
