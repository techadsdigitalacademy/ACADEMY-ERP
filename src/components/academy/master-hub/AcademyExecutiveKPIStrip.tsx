import React from 'react';
import { Card } from '../../Card';
import { Badge } from '../../Badge';
import { formatCurrency } from '../../../services/mockData';
import {
  DollarSign,
  Wallet,
  Users,
  BookOpen,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

interface AcademyExecutiveKPIStripProps {
  totalExpectedFees: number;
  totalCollected: number;
  totalPending: number;
  recoveryRate: number;
  averageRevenuePerStudent: number;
  totalStudents: number;
  totalSeats: number;
  totalAvailableSeats: number;
  overallOccupancy: number;
  runningBatchesCount: number;
  upcomingBatchesCount: number;
  completedBatchesCount: number;
}

export const AcademyExecutiveKPIStrip: React.FC<AcademyExecutiveKPIStripProps> = ({
  totalExpectedFees,
  totalCollected,
  totalPending,
  recoveryRate,
  averageRevenuePerStudent,
  totalStudents,
  totalSeats,
  totalAvailableSeats,
  overallOccupancy,
  runningBatchesCount,
  upcomingBatchesCount,
  completedBatchesCount
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Fee Collected */}
      <Card variant="glass" className="p-4 border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Fee Collected</span>
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-foreground tracking-tight">
            {formatCurrency(totalCollected)}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Badge variant="success" className="text-[9px] py-0 px-1.5 font-bold flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>{recoveryRate}% Recovered</span>
            </Badge>
          </div>
        </div>
      </Card>

      {/* 2. Expected Revenue */}
      <Card variant="glass" className="p-4 border-primary/20 bg-primary-soft/20 flex flex-col justify-between hover:border-primary/40 transition-all shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gross Expected Fees</span>
          <div className="p-2 bg-primary-soft text-primary rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-foreground tracking-tight">
            {formatCurrency(totalExpectedFees)}
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1.5">
            Avg {formatCurrency(averageRevenuePerStudent)} / student
          </p>
        </div>
      </Card>

      {/* 3. Pending Receivables */}
      <Card variant="glass" className="p-4 border-amber-500/20 bg-amber-500/5 flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pending Receivables</span>
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-amber-400 tracking-tight">
            {formatCurrency(totalPending)}
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold mt-1.5">
            {100 - recoveryRate}% Outstanding balance
          </p>
        </div>
      </Card>

      {/* 4. Enrolled Students & Seat Capacity */}
      <Card variant="glass" className="p-4 border-indigo-500/20 bg-indigo-500/5 flex flex-col justify-between hover:border-indigo-500/40 transition-all shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Enrolled Students</span>
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-foreground tracking-tight flex items-baseline gap-1.5">
            <span>{totalStudents}</span>
            <span className="text-xs text-muted-foreground font-normal">/ {totalSeats} seats</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold mt-1.5">
            <span className="text-indigo-400">{totalAvailableSeats} Available</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{overallOccupancy}% Fill Rate</span>
          </div>
        </div>
      </Card>

      {/* 5. Batches Health */}
      <Card variant="glass" className="p-4 border-cyan-500/20 bg-cyan-500/5 flex flex-col justify-between hover:border-cyan-500/40 transition-all shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Batches Pipeline</span>
          <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-foreground tracking-tight">
            {runningBatchesCount + upcomingBatchesCount + completedBatchesCount}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold mt-1.5 flex-wrap">
            <span className="text-emerald-400">{runningBatchesCount} Running</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-amber-400">{upcomingBatchesCount} Upcoming</span>
            {completedBatchesCount > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-purple-400">{completedBatchesCount} Done</span>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
