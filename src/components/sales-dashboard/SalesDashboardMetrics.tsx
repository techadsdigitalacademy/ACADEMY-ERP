import React from 'react';
import { Card } from '../Card';
import { Star } from 'lucide-react';
import { DailyLeaderboardMarquee } from './DailyLeaderboardMarquee';
import { formatCurrency } from '../../services/mockData';

interface SalesDashboardMetricsProps {
  isAdminView: boolean;
  activeStaff: any;
  isOwner: boolean;
  dailyLeaderboard: { name: string; amount: number; avatar?: string }[];
  todayAttendanceStats: { present: number; late: number; halfDay: number; leave: number; inOffice?: number };
  academyRevenue: number;
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
  dailyLeaderboard,
  todayAttendanceStats,
  academyRevenue,
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
      {/* Leaderboard Marquee - Displayed for Sales Team & Admin Overview */}
      {isSalesRoleOrAdmin && (
        <DailyLeaderboardMarquee dailyLeaderboard={dailyLeaderboard} />
      )}

      {/* ADMIN VIEW LAYOUT (Only for Non-Owner Admins) */}
      {showAdminLayout && (
        <div className="space-y-3.5 sm:space-y-6">

          {/* Overhauled Admin Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6">
            
            {/* Card 1: Revenue Month Agency & Academy separately */}
            <Card variant="glass" glowColor="indigo" className="p-3.5 sm:p-5 flex flex-col justify-between min-h-[150px] sm:min-h-[160px] border-primary/10">
              <span className="text-[10px] font-bold text-primary dark:text-primary light:text-primary uppercase tracking-wider block">Month's Revenue Stream</span>
              <div className="space-y-3.5 mt-3">
                <div className="bg-muted-2 dark:bg-muted-2 light:bg-muted p-2.5 rounded-md border border-border dark:border-border light:border-border flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground dark:text-muted-foreground light:text-muted-foreground font-bold uppercase">Agency sales:</span>
                  <span className="text-base font-extrabold text-foreground dark:text-white light:text-foreground">{formatCurrency(totalReceived)}</span>
                </div>
                <div className="bg-muted-2 dark:bg-muted-2 light:bg-muted p-2.5 rounded-md border border-border dark:border-border light:border-border flex justify-between items-center">
                  <span className="text-[10px] text-primary dark:text-primary light:text-primary font-bold uppercase">Academy tuition:</span>
                  <span className="text-base font-extrabold text-primary dark:text-primary light:text-primary">{formatCurrency(academyRevenue)}</span>
                </div>
              </div>
            </Card>

            {/* Card 2: Staff Performance Leaderboard */}
            <Card variant="glass" className="p-5 flex flex-col min-h-[160px] max-h-[180px] overflow-y-auto scrollbar-none border-border dark:border-border light:border-border">
              <span className="text-[10px] font-bold text-primary dark:text-primary light:text-primary uppercase tracking-wider block mb-3">Daily Staff Leaderboard</span>
              <div className="space-y-2.5">
                {dailyLeaderboard?.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-xs bg-muted-2 dark:bg-muted-2 light:bg-muted p-2 rounded-lg border border-border dark:border-border light:border-border">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-warning text-[11px] px-1.5 py-0.5 rounded bg-warning-soft border border-warning/20">{index + 1}.</span>
                      <span className="font-bold text-foreground dark:text-foreground light:text-foreground">{item.name}</span>
                    </div>
                    <span className="font-extrabold text-success dark:text-success light:text-success">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                {dailyLeaderboard.length === 0 && (
                  <span className="text-[10px] text-muted-foreground block text-center py-4 font-bold uppercase">No daily sales logged.</span>
                )}
              </div>
            </Card>

            {/* Card 3: Today's Attendance Summaries */}
            <Card variant="glass" glowColor="emerald" className="p-5 flex flex-col justify-between min-h-[160px] border-success/10">
              <span className="text-[10px] font-bold text-success dark:text-success light:text-success uppercase tracking-wider block">Today's Attendance Status</span>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center mt-3">
                <div className="bg-muted-2 dark:bg-muted-2 light:bg-muted p-1.5 sm:p-2 rounded-md border border-border dark:border-border light:border-border">
                  <span className="text-base sm:text-lg font-extrabold text-success dark:text-success light:text-success">{todayAttendanceStats.present}</span>
                  <span className="text-[7.5px] sm:text-[8px] text-muted-foreground dark:text-muted-foreground light:text-muted-foreground block uppercase font-bold mt-0.5">Present</span>
                </div>
                <div className="bg-muted-2 dark:bg-muted-2 light:bg-muted p-1.5 sm:p-2 rounded-md border border-border dark:border-border light:border-border">
                  <span className="text-base sm:text-lg font-extrabold text-warning dark:text-warning light:text-warning">{todayAttendanceStats.late}</span>
                  <span className="text-[7.5px] sm:text-[8px] text-muted-foreground dark:text-muted-foreground light:text-muted-foreground block uppercase font-bold mt-0.5">Late</span>
                </div>
                <div className="bg-muted-2 dark:bg-muted-2 light:bg-muted p-1.5 sm:p-2 rounded-md border border-border dark:border-border light:border-border">
                  <span className="text-base sm:text-lg font-extrabold text-primary dark:text-primary light:text-primary">{todayAttendanceStats.halfDay}</span>
                  <span className="text-[7.5px] sm:text-[8px] text-muted-foreground dark:text-muted-foreground light:text-muted-foreground block uppercase font-bold mt-0.5">Half</span>
                </div>
                <div className="bg-muted-2 dark:bg-muted-2 light:bg-muted p-1.5 sm:p-2 rounded-md border border-border dark:border-border light:border-border">
                  <span className="text-base sm:text-lg font-extrabold text-primary dark:text-primary light:text-primary">{todayAttendanceStats.leave}</span>
                  <span className="text-[7.5px] sm:text-[8px] text-muted-foreground dark:text-muted-foreground light:text-muted-foreground block uppercase font-bold mt-0.5">Leave</span>
                </div>
                <div className="bg-muted-2 dark:bg-muted-2 light:bg-muted p-1.5 sm:p-2 rounded-md border border-border dark:border-border light:border-border">
                  <span className="text-base sm:text-lg font-extrabold text-primary dark:text-primary light:text-primary">{todayAttendanceStats.inOffice || 0}</span>
                  <span className="text-[7.5px] sm:text-[8px] text-muted-foreground dark:text-muted-foreground light:text-muted-foreground block uppercase font-bold mt-0.5">In Office</span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium block mt-2 text-center">Active tallies for today</span>
            </Card>
          </div>
        </div>
      )}

      {/* STAFF & OWNER TERMINAL LAYOUT */}
      {!showAdminLayout && (
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
