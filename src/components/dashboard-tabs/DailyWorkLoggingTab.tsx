import React from 'react';
import { Card } from '../Card';
import { Button } from '../Button';
import { SalesHistoryLog } from '../SalesHistoryLog';
import { Edit2 } from 'lucide-react';
import { formatCurrency } from '../../services/mockData';

interface DailyWorkLoggingTabProps {
  isCreativeRole: boolean;
  activeStaff: any;
  selectedMonth: string;
  monthReports: any[];
  filteredSales: any[];
  targetAmount: number;
  dailyWorkType: string;
  setDailyWorkType: (val: string) => void;
  dailyWorkDesc: string;
  setDailyWorkDesc: (val: string) => void;
  isSubmittingReport: boolean;
  setIsSubmittingReport: (val: boolean) => void;
  postersCount: string;
  setPostersCount: (val: string) => void;
  reEditsCount: string;
  setReEditsCount: (val: string) => void;
  logosCount: string;
  setLogosCount: (val: string) => void;
  othersCount: string;
  setOthersCount: (val: string) => void;
  adsPlacedCount: string;
  setAdsPlacedCount: (val: string) => void;
  videoWorkCategory: string;
  setVideoWorkCategory: (val: string) => void;
  videoClientName: string;
  setVideoClientName: (val: string) => void;
  videoCount: string;
  setVideoCount: (val: string) => void;
  videoTravelExpense: string;
  setVideoTravelExpense: (val: string) => void;
  addDailyReport: (reportData: any) => Promise<void>;
  renderDailyReportsTable: (reportsList: any[], showActions?: boolean) => React.ReactNode;
  handleViewSlip: (sale: any) => void;
}

export const DailyWorkLoggingTab: React.FC<DailyWorkLoggingTabProps> = ({
  isCreativeRole,
  activeStaff,
  selectedMonth,
  monthReports,
  filteredSales,
  targetAmount,
  dailyWorkType,
  setDailyWorkType,
  dailyWorkDesc,
  setDailyWorkDesc,
  isSubmittingReport,
  setIsSubmittingReport,
  postersCount,
  setPostersCount,
  reEditsCount,
  setReEditsCount,
  logosCount,
  setLogosCount,
  othersCount,
  setOthersCount,
  adsPlacedCount,
  setAdsPlacedCount,
  videoWorkCategory,
  setVideoWorkCategory,
  videoClientName,
  setVideoClientName,
  videoCount,
  setVideoCount,
  videoTravelExpense,
  setVideoTravelExpense,
  addDailyReport,
  renderDailyReportsTable,
  handleViewSlip
}) => {
  return (
    <div className="space-y-6 pt-2">
      {isCreativeRole && (
        /* CREATIVE / MARKETING MODE - DAILY REPORTS LOGGING & HISTORY */
        <div className="space-y-6">
          {/* Daily Report form submission */}
          <Card variant="glass" className="p-5 border-border relative">
            <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 mb-2">
              <Edit2 className="w-5 h-5 text-primary" />
              Log Your Daily Activity Work
            </h3>
            <p className="text-xs text-muted-foreground mb-5">Submit your poster completions, work logs, or campaign ad placements once at the end of the day.</p>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmittingReport(true);
                try {
                  if (activeStaff.designation === 'Graphic Designer') {
                    const pCount = Number(postersCount) || 0;
                    const rCount = Number(reEditsCount) || 0;
                    const lCount = Number(logosCount) || 0;
                    const oCount = Number(othersCount) || 0;
                    await addDailyReport({
                      workType: 'Graphic Design',
                      description: dailyWorkDesc.trim() || `Posters: ${pCount}, Re-edits: ${rCount}, Logos: ${lCount}, Others: ${oCount}`,
                      postersCount: pCount,
                      reEditsCount: rCount,
                      logosCount: lCount,
                      othersCount: oCount
                    });
                    setPostersCount('');
                    setReEditsCount('');
                    setLogosCount('');
                    setOthersCount('');
                  } else if (activeStaff.designation === 'Digital Marketer') {
                    const apCount = Number(adsPlacedCount) || 0;
                    await addDailyReport({
                      workType: 'Digital Marketing',
                      description: dailyWorkDesc.trim() || `Ads Placed: ${apCount}`,
                      adsPlacedCount: apCount
                    });
                    setAdsPlacedCount('');
                  } else if (activeStaff.designation === 'Videographer') {
                    const vCount = Number(videoCount) || 0;
                    const tExp = Number(videoTravelExpense) || 0;
                    await addDailyReport({
                      workType: 'Video Work',
                      description: dailyWorkDesc.trim() || `${videoWorkCategory}: ${vCount} videos, Travel: ${formatCurrency(tExp)}`,
                      workCategory: videoWorkCategory,
                      clientName: videoClientName,
                      videosCount: vCount,
                      travelExpense: tExp
                    });
                    setVideoCount('');
                    setVideoTravelExpense('');
                  } else {
                    if (!dailyWorkType || !dailyWorkDesc.trim()) return;
                    await addDailyReport({
                      workType: dailyWorkType,
                      description: dailyWorkDesc.trim()
                    });
                    setDailyWorkType('');
                  }
                  setDailyWorkDesc('');
                  alert('Daily report submitted successfully!');
                } catch (err: any) {
                  alert('Failed to log report: ' + err.message);
                } finally {
                  setIsSubmittingReport(false);
                }
              }}
              className="space-y-4"
            >
              {activeStaff.designation === 'Graphic Designer' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Total Posters</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      min="0"
                      value={postersCount}
                      onChange={(e) => setPostersCount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Total Re-edits</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      min="0"
                      value={reEditsCount}
                      onChange={(e) => setReEditsCount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Total Logos</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      min="0"
                      value={logosCount}
                      onChange={(e) => setLogosCount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Others (OTH)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      min="0"
                      value={othersCount}
                      onChange={(e) => setOthersCount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs text-foreground focus:outline-none"
                    />
                  </div>
                </div>
              ) : activeStaff.designation === 'Digital Marketer' ? (
                <div className="space-y-1.5 max-w-xs">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Total Ads Placed</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    min="0"
                    value={adsPlacedCount}
                    onChange={(e) => setAdsPlacedCount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs text-foreground focus:outline-none"
                  />
                </div>
              ) : activeStaff.designation === 'Videographer' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Work Category</label>
                    <select
                      required
                      value={videoWorkCategory}
                      onChange={(e) => {
                        setVideoWorkCategory(e.target.value);
                        if (e.target.value !== 'External Client') {
                          setVideoClientName('Tech Ads');
                        } else if (videoClientName === 'Tech Ads') {
                          setVideoClientName('');
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs text-foreground focus:outline-none"
                    >
                      <option value="Tech Ads Agency">Tech Ads Agency</option>
                      <option value="Tech Ads Academy">Tech Ads Academy</option>
                      <option value="External Client">External Client</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Client/Company Name</label>
                    <input 
                      type="text" 
                      required={videoWorkCategory === 'External Client'}
                      disabled={videoWorkCategory !== 'External Client'}
                      placeholder="Tech Ads"
                      value={videoClientName}
                      onChange={(e) => setVideoClientName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs text-foreground focus:outline-none disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Number of Videos</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      min="0"
                      value={videoCount}
                      onChange={(e) => setVideoCount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs text-foreground focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Travel Expense (₹)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      min="0"
                      value={videoTravelExpense}
                      onChange={(e) => setVideoTravelExpense(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs text-foreground focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Work Log Category</label>
                    <select
                      required
                      value={dailyWorkType}
                      onChange={(e) => setDailyWorkType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs text-foreground focus:outline-none"
                    >
                      <option value="">Select Category</option>
                      <option value="Video Shoot">Video Shoot</option>
                      <option value="Editing/Polish">Editing/Polish</option>
                      <option value="General Task">General Task</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Log Date</label>
                    <input
                      type="date"
                      disabled
                      value={new Date().toISOString().split('T')[0]}
                      className="w-full px-3.5 py-2.5 rounded-md bg-muted-2 border border-border text-xs text-muted-foreground focus:outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Description / Notes {activeStaff.designation !== 'Graphic Designer' && activeStaff.designation !== 'Digital Marketer' ? '' : '(Optional)'}</label>
                <textarea
                  required={activeStaff.designation !== 'Graphic Designer' && activeStaff.designation !== 'Digital Marketer'}
                  rows={3}
                  placeholder="Provide details about the designs completed, ad placements set, or video scripts processed..."
                  value={dailyWorkDesc}
                  onChange={(e) => setDailyWorkDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmittingReport}
                className="text-xs font-bold py-2 px-6"
              >
                {isSubmittingReport ? 'Saving Log...' : 'Submit Daily Log'}
              </Button>
            </form>
          </Card>

          {/* Daily Report List history */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">My Submissions ({selectedMonth})</h3>
            {renderDailyReportsTable(monthReports, activeStaff.designation === 'Graphic Designer' || activeStaff.designation === 'Digital Marketer')}
          </div>
        </div>
      )}
      {!isCreativeRole && (
        /* STAFF MODE - READ-ONLY SALES HISTORY */
        <SalesHistoryLog 
          sales={filteredSales}
          targetAmount={targetAmount}
          isAdmin={false}
          onViewSlip={handleViewSlip}
        />
      )}
    </div>
  );
};
