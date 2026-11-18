import React, { useState, useMemo, useEffect } from 'react';
import { Badge } from '../../Badge';
import { formatCurrency } from '../../../services/mockData';
import type { AcademyPerformanceTargets } from '../../../services/academyMetricsService';
import {
  loadAcademyPerformanceTargets,
  computeBatchMetrics,
  computeFinancialAnalytics,
  computeStaffPerformanceMetrics
} from '../../../services/academyMetricsService';
import { AcademyExecutiveKPIStrip } from './AcademyExecutiveKPIStrip';
import { BatchCapacityAnalytics } from './BatchCapacityAnalytics';
import { FinancialYieldAnalytics } from './FinancialYieldAnalytics';
import { CounselorPerformanceMatrix } from './CounselorPerformanceMatrix';
import { TutorDeliveryMatrix } from './TutorDeliveryMatrix';
import { TargetConfigModal } from './TargetConfigModal';
import {
  GraduationCap,
  Layers,
  UserPlus,
  UserCheck,
  Download,
  FileText,
  Settings2,
  RefreshCw
} from 'lucide-react';

export interface AcademyMasterDashboardProps {
  batches: any[];
  students: any[];
  installments: any[];
  attendances: any[];
  staffList: any[];
  activeStaff: any;
  isAdminMode: boolean;
  onNavigateToBatches: () => void;
  onNavigateToStudents: (batchId?: string) => void;
  onNavigateToAttendance: (batchId?: string) => void;
  onNavigateToReports: (counselorId?: string) => void;
  onNavigateToFinances: () => void;
  onEnrollStudent: (batch?: any) => void;
  onRecordPayment?: (student: any) => void;
  onRefreshData?: () => Promise<void>;
}

export const AcademyMasterDashboard: React.FC<AcademyMasterDashboardProps> = ({
  batches = [],
  students = [],
  installments = [],
  attendances = [],
  staffList = [],
  activeStaff,
  isAdminMode = false,
  onNavigateToBatches,
  onNavigateToStudents,
  onNavigateToAttendance,
  onNavigateToReports,
  onNavigateToFinances,
  onEnrollStudent,
  onRecordPayment: _onRecordPayment,
  onRefreshData
}) => {
  // Targets state
  const [targets, setTargets] = useState<AcademyPerformanceTargets>(loadAcademyPerformanceTargets);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isOwner = (activeStaff?.designation || '').toLowerCase().includes('owner');
  const isAdmin = isAdminMode || isOwner;

  // Listen to targets update event across instances
  useEffect(() => {
    const handleTargetsUpdated = (e: any) => {
      if (e.detail) setTargets(e.detail);
    };
    window.addEventListener('tech_ads_academy_targets_updated', handleTargetsUpdated);
    return () => {
      window.removeEventListener('tech_ads_academy_targets_updated', handleTargetsUpdated);
    };
  }, []);

  // Filter staff for targets modal
  const counselorList = useMemo(() => {
    return (staffList || []).filter(s =>
      (s.designation || '').toLowerCase().includes('counselor')
    );
  }, [staffList]);

  const tutorList = useMemo(() => {
    return (staffList || []).filter(s =>
      (s.designation || '').toLowerCase().includes('tutor') ||
      (s.designation || '').toLowerCase().includes('faculty') ||
      (s.designation || '').toLowerCase().includes('trainer') ||
      (s.designation || '').toLowerCase().includes('instructor')
    );
  }, [staffList]);

  // Pillar 1: Batch & Capacity Metrics
  const batchData = useMemo(() => {
    return computeBatchMetrics(batches, students, installments, staffList);
  }, [batches, students, installments, staffList]);

  // Pillar 2: Financial & Fee Collections Analytics
  const financialData = useMemo(() => {
    return computeFinancialAnalytics(students, installments);
  }, [students, installments]);

  // Pillar 3: Staff & Tutor Performance
  const staffMetrics = useMemo(() => {
    return computeStaffPerformanceMetrics(
      students,
      installments,
      batches,
      attendances,
      staffList,
      targets
    );
  }, [students, installments, batches, attendances, staffList, targets]);

  // Refresh handler
  const handleRefresh = async () => {
    if (onRefreshData && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefreshData();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // Comprehensive Excel/CSV Export
  const handleExportExcel = () => {
    try {
      const rows: any[][] = [];
      rows.push(['Tech Ads ERP - Academy Master Executive Report']);
      rows.push([`Generated on: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}`]);
      rows.push([]);

      // Section 1: Executive Financials
      rows.push(['=== EXECUTIVE FINANCIAL SUMMARY ===']);
      rows.push(['Total Gross Expected Fees', formatCurrency(financialData.total_expected_fees)]);
      rows.push(['Total Fees Realized / Collected', formatCurrency(financialData.total_collected)]);
      rows.push(['Total Pending Receivables', formatCurrency(financialData.total_pending)]);
      rows.push(['Overall Recovery Rate', `${financialData.recovery_rate}%`]);
      rows.push(['Average Revenue Per Student', formatCurrency(financialData.average_revenue_per_student)]);
      rows.push([]);

      // Section 2: Batch Inventory
      rows.push(['=== BATCH CAPACITY & OCCUPANCY ===']);
      rows.push([
        'Batch Name',
        'Batch Code',
        'Course Name',
        'Mode',
        'Status',
        'Faculty',
        'Capacity',
        'Enrolled',
        'Available',
        'Occupancy %',
        'Total Expected Fees',
        'Total Collected',
        'Pending Dues',
        'Recovery %'
      ]);

      batchData.batchMetrics.forEach(b => {
        rows.push([
          `"${b.batch_name.replace(/"/g, '""')}"`,
          b.batch_code,
          `"${b.course_name.replace(/"/g, '""')}"`,
          b.mode,
          b.status,
          `"${b.tutor_name.replace(/"/g, '""')}"`,
          b.total_seats,
          b.enrolled_count,
          b.remaining_seats,
          `${b.occupancy_rate}%`,
          b.total_fees,
          b.total_collected,
          b.total_pending,
          `${b.collection_rate}%`
        ]);
      });
      rows.push([]);

      // Section 3: Counselor Performance
      rows.push(['=== COUNSELOR INTAKE & REVENUE ===']);
      rows.push([
        'Counselor Name',
        'Admissions Enrolled',
        'Monthly Target',
        'Achievement %',
        'Gross Fees Booked',
        'Cash Collected Upfront',
        'Pending Receivables'
      ]);

      staffMetrics.counselorMetrics.forEach(c => {
        rows.push([
          `"${c.counselor_name.replace(/"/g, '""')}"`,
          c.admissions_count,
          c.target_admissions,
          `${c.achievement_rate}%`,
          c.total_fees_booked,
          c.upfront_cash_collected,
          c.pending_collections
        ]);
      });
      rows.push([]);

      // Section 4: Tutor Delivery
      rows.push(['=== FACULTY & TUTOR DELIVERY ===']);
      rows.push([
        'Faculty / Tutor',
        'Batches Handled',
        'Active Mentored Students',
        'Class Attendance Rate %',
        'Benchmark Goal %',
        'Student Retention Rate %'
      ]);

      staffMetrics.tutorMetrics.forEach(t => {
        rows.push([
          `"${t.tutor_name.replace(/"/g, '""')}"`,
          t.batches_count,
          t.active_students_count,
          `${t.average_attendance_rate}%`,
          `${t.target_attendance_rate}%`,
          `${t.retention_rate}%`
        ]);
      });

      const csvContent = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Academy_Master_Executive_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Failed to export Academy Excel report:', e);
      alert('Could not export Excel file. Please try again.');
    }
  };

  // Styled PDF Print Letterhead Export
  const handleExportPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export the Academy PDF report.');
        return;
      }

      const batchTableHtml = batchData.batchMetrics.map(b => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px 8px; font-weight: bold;">${b.batch_name}</td>
          <td style="padding: 6px 8px;">${b.course_name}</td>
          <td style="padding: 6px 8px; text-transform: uppercase;">${b.mode}</td>
          <td style="padding: 6px 8px; font-weight: bold; color: ${b.status === 'Running' ? '#059669' : '#d97706'};">${b.status}</td>
          <td style="padding: 6px 8px; text-align: center;">${b.enrolled_count} / ${b.total_seats} (${b.occupancy_rate}%)</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold;">₹${b.total_collected.toLocaleString()}</td>
          <td style="padding: 6px 8px; text-align: right; color: #d97706;">₹${b.total_pending.toLocaleString()}</td>
        </tr>
      `).join('');

      const counselorTableHtml = staffMetrics.counselorMetrics.map(c => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px 8px; font-weight: bold;">${c.counselor_name}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: bold;">${c.admissions_count} / ${c.target_admissions}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: bold; color: ${c.achievement_rate >= 100 ? '#059669' : '#2563eb'};">${c.achievement_rate}%</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #059669;">₹${c.upfront_cash_collected.toLocaleString()}</td>
          <td style="padding: 6px 8px; text-align: right; color: #d97706;">₹${c.pending_collections.toLocaleString()}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Academy Executive Report - Tech Ads ERP</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
              .header { border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px; }
              .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
              .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }
              .kpi-title { font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; }
              .kpi-val { font-size: 18px; font-weight: 900; margin-top: 4px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
              th { background: #f1f5f9; padding: 8px; font-size: 10px; text-transform: uppercase; color: #475569; text-align: left; }
              h3 { font-size: 13px; text-transform: uppercase; color: #0f172a; margin-top: 20px; margin-bottom: 8px; border-left: 3px solid #3b82f6; padding-left: 8px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0; font-size: 20px; color: #0f172a;">Tech Ads Academy • Executive Master Report</h1>
              <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">Generated on: ${new Date().toLocaleDateString('en-IN')} • Confidential Academy Summary</p>
            </div>

            <div class="grid">
              <div class="kpi">
                <div class="kpi-title">Gross Expected Fees</div>
                <div class="kpi-val" style="color: #2563eb;">₹${financialData.total_expected_fees.toLocaleString()}</div>
              </div>
              <div class="kpi">
                <div class="kpi-title">Realized Collections</div>
                <div class="kpi-val" style="color: #059669;">₹${financialData.total_collected.toLocaleString()} (${financialData.recovery_rate}%)</div>
              </div>
              <div class="kpi">
                <div class="kpi-title">Pending Receivables</div>
                <div class="kpi-val" style="color: #d97706;">₹${financialData.total_pending.toLocaleString()}</div>
              </div>
              <div class="kpi">
                <div class="kpi-title">Seat Occupancy</div>
                <div class="kpi-val" style="color: #6366f1;">${batchData.totalEnrolled} / ${batchData.totalSeats} (${batchData.overallOccupancy}%)</div>
              </div>
            </div>

            <h3>Batch Capacity & Financial Yield</h3>
            <table>
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Course</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th style="text-align: center;">Seats</th>
                  <th style="text-align: right;">Collected</th>
                  <th style="text-align: right;">Pending</th>
                </tr>
              </thead>
              <tbody>
                ${batchTableHtml}
              </tbody>
            </table>

            <h3>Counselor Intake & Target Achievement</h3>
            <table>
              <thead>
                <tr>
                  <th>Counselor</th>
                  <th style="text-align: center;">Admissions / Goal</th>
                  <th style="text-align: center;">Achievement</th>
                  <th style="text-align: right;">Cash Collected</th>
                  <th style="text-align: right;">Pending Dues</th>
                </tr>
              </thead>
              <tbody>
                ${counselorTableHtml}
              </tbody>
            </table>

            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e) {
      console.error('Failed to export Academy PDF report:', e);
      alert('Could not export PDF report. Please try again.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card & Quick Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-card/60 border border-border p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary-soft text-primary border border-primary/20 shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-foreground tracking-tight">
                Academy Master Command & Reporting Hub
              </h2>
              <Badge variant="indigo" className="text-[9px] py-0 px-1.5 font-bold">
                Executive Hub
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Consolidated real-time batch occupancy, fee collection intelligence & staff delivery metrics
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
          {onRefreshData && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg text-xs font-bold bg-muted hover:bg-muted-2 text-foreground border border-border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Refresh Academy live dataset"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          <button
            onClick={onNavigateToBatches}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-muted hover:bg-muted-2 text-foreground border border-border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Manage Batches</span>
          </button>

          <button
            onClick={() => onEnrollStudent()}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Enroll Student</span>
          </button>

          <button
            onClick={() => onNavigateToAttendance()}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-muted hover:bg-muted-2 text-foreground border border-border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Attendance</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsTargetModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-muted hover:bg-muted-2 text-foreground border border-border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Configure counselor admissions and tutor attendance targets"
            >
              <Settings2 className="w-3.5 h-3.5 text-primary" />
              <span>Targets</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Export complete Academy operational & financial dataset to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Generate and print executive letterhead summary"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* KPI STRIP: 5 High-Impact Glass Cards */}
      <AcademyExecutiveKPIStrip
        totalExpectedFees={financialData.total_expected_fees}
        totalCollected={financialData.total_collected}
        totalPending={financialData.total_pending}
        recoveryRate={financialData.recovery_rate}
        averageRevenuePerStudent={financialData.average_revenue_per_student}
        totalStudents={batchData.totalEnrolled}
        totalSeats={batchData.totalSeats}
        totalAvailableSeats={batchData.totalAvailable}
        overallOccupancy={batchData.overallOccupancy}
        runningBatchesCount={batchData.runningCount}
        upcomingBatchesCount={batchData.upcomingCount}
        completedBatchesCount={batchData.completedCount}
      />

      {/* SECTION 1: Batch & Seat Capacity Analytics */}
      <BatchCapacityAnalytics
        batches={batchData.batchMetrics}
        courseStats={batchData.courseStreamStats}
        onNavigateToBatches={onNavigateToBatches}
        onNavigateToStudents={onNavigateToStudents}
        onEnrollInBatch={(b) => {
          const rawBatch = (batches || []).find(rb => rb.id === b.id) || b;
          onEnrollStudent(rawBatch);
        }}
      />

      {/* SECTION 2: Financial & Fee Collections Analytics */}
      <FinancialYieldAnalytics
        financials={financialData}
        batchMetrics={batchData.batchMetrics}
        onNavigateToFinances={onNavigateToFinances}
        onNavigateToStudentHubWithFilter={(_filter) => {
          onNavigateToStudents();
        }}
      />

      {/* SECTION 3: Staff & Faculty Delivery Matrices (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CounselorPerformanceMatrix
          counselorMetrics={staffMetrics.counselorMetrics}
          isAdmin={isAdmin}
          onOpenTargetModal={() => setIsTargetModalOpen(true)}
          onNavigateToReports={onNavigateToReports}
        />

        <TutorDeliveryMatrix
          tutorMetrics={staffMetrics.tutorMetrics}
          onNavigateToAttendance={() => onNavigateToAttendance()}
          onNavigateToBatches={onNavigateToBatches}
        />
      </div>

      {/* TARGET CONFIGURATION MODAL */}
      <TargetConfigModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        currentTargets={targets}
        counselorList={counselorList}
        tutorList={tutorList}
        onTargetsSaved={(updated) => setTargets(updated)}
      />
    </div>
  );
};
