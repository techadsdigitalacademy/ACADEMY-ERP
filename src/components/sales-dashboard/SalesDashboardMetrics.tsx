import React from 'react';
import { Card } from '../Card';
import { 
  Star, GraduationCap, Users, Layers, BookOpen, Calendar, MapPin, Globe, 
  UserPlus, Clock 
} from 'lucide-react';
import { DailyLeaderboardMarquee } from './DailyLeaderboardMarquee';
import { formatCurrency } from '../../services/mockData';

interface SalesDashboardMetricsProps {
  isAdminView: boolean;
  activeStaff: any;
  isOwner: boolean;
  isCounselor?: boolean;
  counselorBatches?: any[];
  counselorStudents?: any[];
  onOpenAdmissionModal?: (batch?: any) => void;
  dailyLeaderboard: { name: string; amount: number; avatar?: string }[];
  todayAttendanceStats: { present: number; late: number; halfDay: number; leave: number; inOffice?: number };
  academyRevenue: number;
  activeStudentsCount?: number;
  batchesStats?: { total: number; upcoming: number; running: number };
  totalReceived: number;
  totalPackage: number;
  totalBalance: number;
  totalRefund?: number;
  targetAmount: number;
  targetPercent: number;
  todayAttendance: any;
  monthReports: any[];
  selectedMonth: string;
  formatTimeStr: (timeStr?: string) => string;
  onOpenPunchModal: (type: 'IN' | 'OUT') => void;
  getDailyReportTotals: (reportsList: any[]) => any;
}

export const SalesDashboardMetrics: React.FC<SalesDashboardMetricsProps> = ({
  isAdminView,
  activeStaff,
  isOwner,
  isCounselor = false,
  counselorBatches = [],
  counselorStudents = [],
  onOpenAdmissionModal,
  dailyLeaderboard,
  todayAttendanceStats,
  academyRevenue,
  activeStudentsCount = 0,
  batchesStats = { total: 0, upcoming: 0, running: 0 },
  totalReceived,
  totalPackage,
  totalBalance,
  totalRefund = 0,
  targetAmount,
  targetPercent,
  todayAttendance,
  monthReports,
  selectedMonth,
  formatTimeStr,
  onOpenPunchModal,
  getDailyReportTotals
}) => {
  const isSalesRoleOrAdmin = isAdminView || activeStaff?.designation === 'Sales Executive' || isOwner;
  const showAdminLayout = isAdminView && !isOwner;

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Leaderboard Marquee - Displayed for Sales Team & Admin Overview, hidden for Counselor */}
      {isSalesRoleOrAdmin && !isCounselor && (
        <DailyLeaderboardMarquee dailyLeaderboard={dailyLeaderboard} />
      )}

      {/* ADMIN VIEW LAYOUT (Only for Non-Owner Admins) */}
      {showAdminLayout && (
        <div className="space-y-4 sm:space-y-6">
          {/* 1. Academy Overview Main Cards Row (Total Revenue, Active Students, Total Batches) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
            
            {/* Card 1: Master Revenue (Replaces Agency Sales) */}
            <Card variant="glass" glowColor="indigo" className="p-4 sm:p-5 flex flex-col justify-between border-primary/20 bg-primary-soft/30 hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Master Revenue</span>
                <div className="p-2 rounded-lg bg-primary-soft text-primary border border-primary/20">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {formatCurrency(academyRevenue)}
                </div>
                <p className="text-[10px] text-muted-foreground font-semibold mt-1">Total academy fee collections & tuition</p>
              </div>
            </Card>

            {/* Card 2: Active Students */}
            <Card variant="glass" glowColor="emerald" className="p-4 sm:p-5 flex flex-col justify-between border-success/20 bg-success-soft/30 hover:border-success/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-success uppercase tracking-wider">Active Students</span>
                <div className="p-2 rounded-lg bg-success-soft text-success border border-success/20">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {activeStudentsCount}
                </div>
                <p className="text-[10px] text-muted-foreground font-semibold mt-1">Enrolled students in academy courses</p>
              </div>
            </Card>

            {/* Card 3: Total Batches */}
            <Card variant="glass" className="p-4 sm:p-5 flex flex-col justify-between border-border hover:border-border transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-secondary-foreground uppercase tracking-wider">Total Batches</span>
                <div className="p-2 rounded-lg bg-muted text-foreground border border-border">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-2">
                <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {batchesStats.total}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-soft text-primary border border-primary/20">
                    {batchesStats.upcoming} Upcoming
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success-soft text-success border border-success/20">
                    {batchesStats.running} Running
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* 2. Compact Daily Staff Leaderboard & Today's Attendance Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Card 1: Daily Staff Leaderboard */}
            <Card variant="glass" className="p-4 flex flex-col border-border max-h-[190px]">
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-border">
                <span className="text-[11px] font-bold text-secondary-foreground uppercase tracking-wider">Daily Staff Leaderboard</span>
                <span className="text-[10px] text-muted-foreground font-semibold">Today</span>
              </div>
              <div className="space-y-1.5 overflow-y-auto pr-1 scrollbar-none flex-1">
                {dailyLeaderboard?.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-xs bg-muted-2 p-2 rounded-md border border-border">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-warning text-[10px] px-1.5 py-0.5 rounded bg-warning-soft border border-warning/20">{index + 1}.</span>
                      <span className="font-bold text-foreground text-xs">{item.name}</span>
                    </div>
                    <span className="font-extrabold text-success text-xs">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                {dailyLeaderboard.length === 0 && (
                  <span className="text-[10px] text-muted-foreground block text-center py-4 font-bold uppercase">No daily sales logged.</span>
                )}
              </div>
            </Card>

            {/* Card 2: Today's Attendance Summaries */}
            <Card variant="glass" glowColor="emerald" className="p-4 flex flex-col justify-between border-success/15 max-h-[190px]">
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-border">
                <span className="text-[11px] font-bold text-success uppercase tracking-wider">Today's Attendance Status</span>
                <span className="text-[10px] text-muted-foreground font-semibold">Staff Overview</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center my-auto">
                <div className="bg-muted-2 p-2 rounded-md border border-border">
                  <span className="text-base sm:text-lg font-extrabold text-success">{todayAttendanceStats.present}</span>
                  <span className="text-[7.5px] sm:text-[8px] text-muted-foreground block uppercase font-bold mt-0.5">Present</span>
                </div>
                <div className="bg-muted-2 p-2 rounded-md border border-border">
                  <span className="text-base sm:text-lg font-extrabold text-warning">{todayAttendanceStats.late}</span>
                  <span className="text-[7.5px] sm:text-[8px] text-muted-foreground block uppercase font-bold mt-0.5">Late</span>
                </div>
                <div className="bg-muted-2 p-2 rounded-md border border-border">
                  <span className="text-base sm:text-lg font-extrabold text-primary">{todayAttendanceStats.halfDay}</span>
                  <span className="text-[7.5px] sm:text-[8px] text-muted-foreground block uppercase font-bold mt-0.5">Half</span>
                </div>
                <div className="bg-muted-2 p-2 rounded-md border border-border">
                  <span className="text-base sm:text-lg font-extrabold text-primary">{todayAttendanceStats.leave}</span>
                  <span className="text-[7.5px] sm:text-[8px] text-muted-foreground block uppercase font-bold mt-0.5">Leave</span>
                </div>
                <div className="bg-muted-2 p-2 rounded-md border border-border">
                  <span className="text-base sm:text-lg font-extrabold text-primary">{todayAttendanceStats.inOffice || 0}</span>
                  <span className="text-[7.5px] sm:text-[8px] text-muted-foreground block uppercase font-bold mt-0.5">In Office</span>
                </div>
              </div>
              <span className="text-[9px] text-muted-foreground font-medium block mt-1.5 text-center">Active tallies for today</span>
            </Card>
          </div>
        </div>
      )}

      {/* COUNSELOR ADMISSIONS TERMINAL VIEW */}
      {!showAdminLayout && isCounselor && (
        <div className="space-y-6">
          {/* Top Row: Attendance & Counselor Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Punch In / Attendance Status Card */}
            <Card variant="glass" className="p-5 flex flex-col justify-between h-full min-h-[190px] border-border bg-card/60 backdrop-blur-md">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Attendance Tracker</p>
                  <h4 className={`text-base font-extrabold tracking-wide uppercase mt-1 ${!todayAttendance ? 'text-muted-foreground' : !todayAttendance.punch_out ? 'text-success' : 'text-primary'}`}>
                    {!todayAttendance ? 'Not Checked In' : !todayAttendance.punch_out ? 'In Office' : 'Punched Out'}
                  </h4>
                </div>
                {todayAttendance && (
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg ${!todayAttendance.punch_out ? 'text-success bg-success-soft border border-success/20' : 'text-primary bg-primary-soft border border-primary/20'}`}>
                    {!todayAttendance.punch_out ? 'Active' : 'Completed'}
                  </span>
                )}
              </div>

              <div className="my-2.5 space-y-1">
                {todayAttendance ? (
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    In: <span className="text-foreground font-bold">{todayAttendance.punch_in}</span>
                    {todayAttendance.punch_out && (
                      <> &bull; Out: <span className="text-foreground font-bold">{todayAttendance.punch_out}</span></>
                    )}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Please punch in today to record attendance.
                  </p>
                )}
                <p className="text-[9px] text-muted-foreground font-semibold uppercase">
                  Shift: {formatTimeStr(activeStaff?.shift_start_time || '09:30:00')} &bull; End Time: {formatTimeStr(activeStaff?.shift_end_time || ((activeStaff as any).gender === 'Female' ? '17:00:00' : '18:30:00'))}
                </p>
              </div>

              <div className="w-full mt-2">
                {!todayAttendance ? (
                  <button
                    onClick={() => onOpenPunchModal('IN')}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold py-2.5 text-xs tracking-widest uppercase shadow-lg hover:-translate-y-0.5 active:scale-95 rounded-md transition-all duration-300 flex items-center justify-center gap-2 border border-primary/30 cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    PUNCH IN
                  </button>
                ) : !todayAttendance.punch_out ? (
                  <button
                    onClick={() => onOpenPunchModal('OUT')}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold py-2.5 text-xs tracking-widest uppercase shadow-lg hover:-translate-y-0.5 active:scale-95 rounded-md transition-all duration-300 flex items-center justify-center gap-2 border border-primary/30 cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    PUNCH OUT
                  </button>
                ) : (
                  <div className="w-full text-center py-2.5 rounded-md bg-muted-2 border border-border text-muted-foreground font-bold text-xs uppercase tracking-wider select-none">
                    ✅ Punched Out
                  </div>
                )}
              </div>
            </Card>

            {/* 2. Counselor Overview: Batches In Admissions */}
            <Card variant="glass" glowColor="indigo" className="p-5 flex flex-col justify-between border-primary/20 bg-primary-soft/20 min-h-[190px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Admissions Inventory</span>
                <div className="p-2 rounded-lg bg-primary-soft text-primary border border-primary/20">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-3xl font-black text-foreground tracking-tight">
                  {counselorBatches.length} <span className="text-sm font-semibold text-muted-foreground">batches</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-semibold mt-1">
                  {counselorBatches.filter(b => (b.status || '').toLowerCase() === 'upcoming').length} Upcoming &bull; {counselorBatches.filter(b => (b.status || '').toLowerCase() === 'running').length} Running
                </p>
              </div>
              <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground font-medium flex justify-between items-center">
                <span>Active Courses</span>
                <span className="text-primary font-bold">Open for Enrollment</span>
              </div>
            </Card>

            {/* 3. Counselor Overview: Live Available Seats */}
            {(() => {
              const totalCap = counselorBatches.reduce((sum, b) => sum + (Number(b.total_seats) || 30), 0);
              const totalEnrolled = counselorStudents.length;
              const openBalance = Math.max(0, totalCap - totalEnrolled);
              return (
                <Card variant="glass" glowColor="emerald" className="p-5 flex flex-col justify-between border-success/20 bg-success-soft/20 min-h-[190px] md:col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-success uppercase tracking-wider">Available Seats</span>
                    <div className="p-2 rounded-lg bg-success-soft text-success border border-success/20">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-3xl font-black text-foreground tracking-tight">
                      {openBalance} <span className="text-sm font-semibold text-muted-foreground">seats left</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-semibold mt-1">
                      {totalEnrolled} students enrolled out of {totalCap} total seats
                    </p>
                  </div>
                  <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground font-medium flex justify-between items-center">
                    <span>Overall Fill Rate</span>
                    <span className="text-success font-bold">
                      {totalCap > 0 ? Math.round((totalEnrolled / totalCap) * 100) : 0}% Filled
                    </span>
                  </div>
                </Card>
              );
            })()}
          </div>

          {/* Prominently Featured: Large Upcoming Batches Cards */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-md">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight flex items-center gap-2">
                    Upcoming Batches & Seat Availability
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary-soft text-primary border border-primary/20 font-bold">
                      {counselorBatches.length} Active
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    Live seat inventory counters, course details, and quick one-click student admission triggers
                  </p>
                </div>
              </div>

              {onOpenAdmissionModal && (
                <button
                  onClick={() => onOpenAdmissionModal()}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Quick Admission</span>
                </button>
              )}
            </div>

            {/* Batches Grid */}
            {counselorBatches.length === 0 ? (
              <Card variant="glass" className="p-10 text-center border-dashed border-border">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <h4 className="text-base font-bold text-foreground">No Batches Currently Scheduled</h4>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto">
                  There are currently no active or upcoming batches registered in the academy. You can create a new batch in Academy Batches.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {counselorBatches.map((batch: any) => {
                  const bStudents = counselorStudents.filter(s => s.batch_id === batch.id);
                  const filledSeats = bStudents.length;
                  const totalSeats = Number(batch.total_seats) || 30;
                  const balanceSeats = Math.max(0, totalSeats - filledSeats);
                  const fillPct = totalSeats > 0 ? Math.min(100, Math.round((filledSeats / totalSeats) * 100)) : 0;
                  const isUpcoming = (batch.status || '').toLowerCase() === 'upcoming';

                  return (
                    <Card 
                      key={batch.id} 
                      variant="glass" 
                      className="p-5 flex flex-col justify-between border-border hover:border-primary/50 transition-all shadow-md hover:shadow-xl bg-card/75 backdrop-blur-md relative overflow-hidden group rounded-xl"
                    >
                      {/* Batch Top Header */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            isUpcoming 
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            &bull; {batch.status || 'Upcoming'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground flex items-center gap-1 border border-border">
                            {batch.mode?.toLowerCase() === 'online' ? (
                              <><Globe className="w-3 h-3 text-cyan-400" /> Online</>
                            ) : (
                              <><MapPin className="w-3 h-3 text-amber-400" /> Offline</>
                            )}
                          </span>
                        </div>

                        {/* Course Name and Batch Code */}
                        <div>
                          <h4 className="text-base font-black text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1">
                            {batch.course_name || batch.batch_name}
                          </h4>
                          <p className="text-xs font-semibold text-muted-foreground mt-0.5 flex items-center gap-1">
                            <span>{batch.batch_name}</span>
                          </p>
                        </div>

                        {/* Course Details (Start Date & Tuition Fee) */}
                        <div className="grid grid-cols-2 gap-2 pt-2.5 pb-1 border-t border-border/50 text-[11px]">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="font-semibold text-foreground">
                              {batch.start_date || 'TBA'}
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-1 font-black text-foreground">
                            <span className="text-muted-foreground text-[10px] font-medium">Fee:</span>
                            <span className="text-primary font-black text-xs sm:text-sm">{formatCurrency(batch.fee_amount || 0)}</span>
                          </div>
                        </div>

                        {/* Live Seat Availability Box */}
                        <div className="bg-muted-2 p-3.5 rounded-xl border border-border/80 space-y-2.5">
                          <div className="grid grid-cols-3 gap-1 text-center">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Total</span>
                              <span className="text-base font-black text-foreground">{totalSeats}</span>
                            </div>
                            <div className="border-x border-border/60">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Enrolled</span>
                              <span className="text-base font-black text-foreground">{filledSeats}</span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-emerald-400 block">Available</span>
                              <span className={`text-base font-black ${balanceSeats <= 3 ? 'text-danger' : balanceSeats <= 8 ? 'text-warning' : 'text-success'}`}>
                                {balanceSeats}
                              </span>
                            </div>
                          </div>

                          {/* Seat Fill Progress Bar */}
                          <div className="space-y-1">
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  fillPct >= 90 ? 'bg-danger' : fillPct >= 70 ? 'bg-warning' : 'bg-success'
                                }`} 
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[9.5px] text-muted-foreground font-semibold px-0.5">
                              <span>{fillPct}% Seats Occupied</span>
                              <span className={balanceSeats <= 3 ? 'text-danger font-bold' : 'text-success font-bold'}>
                                {balanceSeats === 0 ? 'Batch Full' : `${balanceSeats} seats open`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Admission Trigger */}
                      <button
                        onClick={() => onOpenAdmissionModal && onOpenAdmissionModal(batch)}
                        className="w-full mt-3.5 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>+ Enroll Student</span>
                      </button>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STANDARD STAFF & OWNER TERMINAL LAYOUT (For Sales Executives, Creative, Owners) */}
      {!showAdminLayout && !isCounselor && (
        <div className="space-y-6">
          {/* Standard Staff Cards (Target Goal, Punch-in and Personal stats) */}
          <div className={`grid grid-cols-1 ${
 activeStaff.designation === 'Graphic Designer' || activeStaff.designation === 'Digital Marketer' || activeStaff.designation === 'Videographer' 
 ? 'max-w-3xl md:grid-cols-2'
 : 'lg:grid-cols-3'
 } gap-6`}>
            {/* Target Card */}
            {activeStaff.designation !== 'Graphic Designer' && activeStaff.designation !== 'Digital Marketer' && activeStaff.designation !== 'Videographer' && (
              <Card variant="glass" glowColor="indigo" className="p-5 flex flex-col justify-between h-full min-h-[185px]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Target Goal</p>
                    <p className="text-sm font-semibold text-muted-foreground mt-0.5">{formatCurrency(targetAmount)}</p>
                  </div>
                  <span className="text-primary font-extrabold text-[10px] bg-primary-soft px-2 py-0.5 rounded-lg">{targetPercent}% Achieved</span>
                </div>

                <div className="grid grid-cols-2 gap-3 my-3">
                  <div className="bg-muted-2 p-2.5 rounded-md border border-border">
                    <span className="text-[8.5px] text-muted-foreground block uppercase font-bold">Collected</span>
                    <span className="text-lg font-extrabold text-success">{formatCurrency(totalReceived)}</span>
                  </div>
                  <div className="bg-muted-2 p-2.5 rounded-md border border-border">
                    <span className="text-[8.5px] text-muted-foreground block uppercase font-bold">Remaining</span>
                    <span className="text-lg font-extrabold text-warning">
                      {totalReceived >= targetAmount ? 'Smashed!' : formatCurrency(targetAmount - totalReceived)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${targetPercent}%` }}></div>
                  </div>
                </div>
              </Card>
            )}

            {/* Attendance Status Card (Duplicated in Sales Hub) */}
            <Card variant="glass" className="p-5 flex flex-col justify-between h-full min-h-[185px] border-border">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Current Status</p>
                  <h4 className={`text-sm font-extrabold tracking-wide uppercase mt-1 ${!todayAttendance ? 'text-muted-foreground' : !todayAttendance.punch_out ? 'text-success' : 'text-primary'}`}>
                    {!todayAttendance ? 'Not Checked In' : !todayAttendance.punch_out ? 'In Office' : 'Punched Out'}
                  </h4>
                </div>
                {todayAttendance && (
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg ${!todayAttendance.punch_out ? 'text-success bg-success-soft' : 'text-primary bg-primary-soft'}`}>
                    {!todayAttendance.punch_out ? 'Active' : 'Completed'}
                  </span>
                )}
              </div>

              <div className="my-2.5 space-y-1">
                {todayAttendance ? (
                  <p className="text-[10px] text-muted-foreground font-semibold">
                     In: <span className="text-foreground font-bold">{todayAttendance.punch_in}</span>
                    {todayAttendance.punch_out && (
                      <> &bull;  Out: <span className="text-foreground font-bold">{todayAttendance.punch_out}</span></>
                    )}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Please check in today to log attendance.
                  </p>
                )}
                <p className="text-[8.5px] text-muted-foreground font-semibold uppercase">
                  Shift: {formatTimeStr(activeStaff?.shift_start_time || '09:30:00')} &bull; End Time: {formatTimeStr(activeStaff?.shift_end_time || ((activeStaff as any).gender === 'Female' ? '17:00:00' : '18:30:00'))}
                </p>
              </div>

              <div className="w-full mt-2">
                {!todayAttendance ? (
                  <button
                    onClick={() => onOpenPunchModal('IN')}
                    className="w-full bg-primary hover:text-white font-extrabold py-2.5 text-xs tracking-widest uppercase shadow-lg hover:-translate-y-0.5 active:scale-95 rounded-md transition-all duration-300 flex items-center justify-center gap-2 border border-border cursor-pointer"
                  >
                    PUNCH IN
                  </button>
                ) : !todayAttendance.punch_out ? (
                  <button
                    onClick={() => onOpenPunchModal('OUT')}
                    className="w-full bg-primary hover:text-white font-extrabold py-2.5 text-xs tracking-widest uppercase shadow-lg hover:-translate-y-0.5 active:scale-95 rounded-md transition-all duration-300 flex items-center justify-center gap-2 border border-border cursor-pointer"
                  >
                    PUNCH OUT
                  </button>
                ) : (
                  <div className="w-full text-center py-2.5 rounded-md bg-muted-2 border border-border text-muted-foreground font-bold text-xs uppercase tracking-wider select-none">
                    ✅ Punched Out
                  </div>
                )}
              </div>
            </Card>

            {/* Monthly Summary Widget for Graphic Designer / Digital Marketer / Videographer */}
            {(activeStaff.designation === 'Graphic Designer' || activeStaff.designation === 'Digital Marketer' || activeStaff.designation === 'Videographer') && (() => {
              const monthlyTotals = getDailyReportTotals(monthReports);
              return (
                <Card variant="glass" glowColor="indigo" className="p-5 flex flex-col justify-between h-full min-h-[185px]">
                  <div>
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Monthly Productivity Summary</p>
                    <h4 className="text-xs font-extrabold text-foreground mt-1 uppercase tracking-wider">
                      {activeStaff.designation} Overview
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 my-3.5">
                    {activeStaff.designation === 'Graphic Designer' ? (
                      <>
                        <div className="bg-muted-2 p-2 rounded-md border border-border text-center">
                          <span className="text-[8px] text-muted-foreground block uppercase font-bold">Posters</span>
                          <span className="text-sm font-extrabold text-foreground">{monthlyTotals.totalPosters}</span>
                        </div>
                        <div className="bg-muted-2 p-2 rounded-md border border-border text-center">
                          <span className="text-[8px] text-muted-foreground block uppercase font-bold">Re-edits</span>
                          <span className="text-sm font-extrabold text-primary">{monthlyTotals.totalReEdits}</span>
                        </div>
                        <div className="bg-muted-2 p-2 rounded-md border border-border text-center">
                          <span className="text-[8px] text-muted-foreground block uppercase font-bold">Logos</span>
                          <span className="text-sm font-extrabold text-success">{monthlyTotals.totalLogos}</span>
                        </div>
                        <div className="bg-muted-2 p-2 rounded-md border border-border text-center">
                          <span className="text-[8px] text-muted-foreground block uppercase font-bold">Others</span>
                          <span className="text-sm font-extrabold text-primary">{monthlyTotals.totalOthers}</span>
                        </div>
                      </>
                    ) : activeStaff.designation === 'Videographer' ? (
                      <>
                        <div className="bg-muted-2 p-2 rounded-md border border-border text-center">
                          <span className="text-[7.5px] text-muted-foreground block uppercase font-bold">Agency Videos</span>
                          <span className="text-sm font-extrabold text-foreground">{monthlyTotals.totalAgencyVideos}</span>
                        </div>
                        <div className="bg-muted-2 p-2 rounded-md border border-border text-center">
                          <span className="text-[7.5px] text-muted-foreground block uppercase font-bold">Academy Videos</span>
                          <span className="text-sm font-extrabold text-primary">{monthlyTotals.totalAcademyVideos}</span>
                        </div>
                        <div className="bg-muted-2 p-2 rounded-md border border-border text-center">
                          <span className="text-[7.5px] text-muted-foreground block uppercase font-bold">External Videos</span>
                          <span className="text-sm font-extrabold text-success">{monthlyTotals.totalExternalVideos}</span>
                        </div>
                        <div className="bg-muted-2 p-2 rounded-md border border-border text-center flex flex-col justify-center">
                          <span className="text-[7.5px] text-muted-foreground block uppercase font-bold">Travel Expenses</span>
                          <span className="text-[10px] font-extrabold text-primary truncate block mt-0.5">{formatCurrency(monthlyTotals.totalTravelExpenses)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="bg-muted-2 p-3 rounded-md border border-border col-span-2 flex justify-between items-center">
                        <div>
                          <span className="text-[8.5px] text-muted-foreground block uppercase font-bold">Total Ads Placed</span>
                          <span className="text-xl font-extrabold text-success mt-1 block">{monthlyTotals.totalAdsPlaced}</span>
                        </div>
                        <div className="p-2 rounded-md bg-success-soft text-success border border-success/20">
                          <Star className="w-5 h-5 animate-pulse" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider flex justify-between items-center pt-2 border-t border-border">
                    <span>Month: {selectedMonth}</span>
                    <span className="text-primary">Keep it up!</span>
                  </div>
                </Card>
              );
            })()}

            {/* Financial Metrics */}
            {activeStaff.designation !== 'Graphic Designer' && activeStaff.designation !== 'Digital Marketer' && activeStaff.designation !== 'Videographer' && (
              <div className="grid grid-cols-3 md:grid-cols-1 gap-3.5 h-full">
                <Card variant="glass" className="p-3.5 flex flex-col justify-between md:h-[55px] md:flex-row md:items-center">
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase">Contract Total</span>
                  <p className="text-sm font-extrabold text-foreground">{formatCurrency(totalPackage)}</p>
                </Card>
                <Card variant="glass" className="p-3.5 flex flex-col justify-between md:h-[55px] md:flex-row md:items-center">
                  <span className="text-[9px] font-semibold text-success uppercase">Received Total</span>
                  <p className="text-sm font-extrabold text-success">{formatCurrency(totalReceived)}</p>
                </Card>
                {totalRefund > 0 && (
                  <Card variant="glass" className="p-3.5 flex flex-col justify-between md:h-[55px] md:flex-row md:items-center border-danger/10">
                    <span className="text-[9px] font-semibold text-danger uppercase">Total Refund</span>
                    <p className="text-sm font-extrabold text-danger">{formatCurrency(totalRefund)}</p>
                  </Card>
                )}
                <Card variant="glass" className="p-3.5 flex flex-col justify-between md:h-[55px] md:flex-row md:items-center">
                  <span className="text-[9px] font-semibold text-warning uppercase">Balance Total</span>
                  <p className="text-sm font-extrabold text-warning">{formatCurrency(totalBalance)}</p>
                </Card>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
