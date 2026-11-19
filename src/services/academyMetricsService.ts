/**
 * Academy Metrics & Analytics Computation Engine
 * Aggregates batches, students, fee collections, student attendance, and staff performance.
 */
import { supabase } from './supabase';
import { getCollectionMonthKey, isStudentDiscontinued, getStudentFinancialState } from '../utils/dateAttribution';

export interface AcademyPerformanceTargets {
  counselor_admissions_target: number; // default admissions goal per counselor/month
  tutor_attendance_target: number; // default class attendance % goal
  custom_counselor_targets?: Record<string, number>;
  custom_tutor_targets?: Record<string, number>;
}

export interface AcademyBatchMetric {
  id: string;
  batch_name: string;
  batch_code: string;
  course_name: string;
  mode: 'Online' | 'Offline';
  status: 'Running' | 'Upcoming' | 'Completed' | string;
  start_date: string;
  total_seats: number;
  enrolled_count: number;
  remaining_seats: number;
  occupancy_rate: number;
  tutor_id?: string;
  tutor_name: string;
  total_fees: number;
  total_collected: number;
  total_pending: number;
  collection_rate: number;
}

export interface AcademyCounselorMetric {
  id: string;
  counselor_name: string;
  admissions_count: number;
  target_admissions: number;
  achievement_rate: number;
  total_fees_booked: number;
  upfront_cash_collected: number;
  pending_collections: number;
  collection_rate: number;
}

export interface AcademyTutorMetric {
  id: string;
  tutor_name: string;
  batches_count: number;
  active_students_count: number;
  total_classes_marked: number;
  average_attendance_rate: number;
  target_attendance_rate: number;
  retention_rate: number;
}

export interface AcademyFinancialAnalytics {
  total_expected_fees: number;
  total_collected: number;
  total_pending: number;
  recovery_rate: number;
  average_revenue_per_student: number;
  discontinued_unrealized_fees?: number;
  payment_methods: {
    name: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  fee_aging: {
    cleared: { count: number; total_fees: number; paid_fees: number };
    in_progress: { count: number; total_fees: number; paid_fees: number; pending_fees: number };
    critical: { count: number; total_fees: number; paid_fees: number; pending_fees: number };
  };
  monthly_trend: {
    month: string;
    amount: number;
    count: number;
  }[];
}

const DEFAULT_TARGETS: AcademyPerformanceTargets = {
  counselor_admissions_target: 10,
  tutor_attendance_target: 90,
  custom_counselor_targets: {},
  custom_tutor_targets: {}
};

const TARGETS_STORAGE_KEY = 'tech_ads_academy_performance_targets';

export const loadAcademyPerformanceTargets = (): AcademyPerformanceTargets => {
  try {
    const raw = localStorage.getItem(TARGETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_TARGETS,
        ...parsed,
        custom_counselor_targets: parsed.custom_counselor_targets || {},
        custom_tutor_targets: parsed.custom_tutor_targets || {}
      };
    }
  } catch (e) {
    console.warn('Failed to parse performance targets from storage, using defaults:', e);
  }
  return DEFAULT_TARGETS;
};

export const saveAcademyPerformanceTargets = (targets: AcademyPerformanceTargets): void => {
  try {
    localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(targets));
    window.dispatchEvent(new CustomEvent('tech_ads_academy_targets_updated', { detail: targets }));
  } catch (e) {
    console.error('Failed to save performance targets:', e);
  }
};

/**
 * Computes all Batch & Student Capacity metrics
 */
export const computeBatchMetrics = (
  batches: any[],
  students: any[],
  installments: any[],
  staffList: any[]
): {
  batchMetrics: AcademyBatchMetric[];
  totalSeats: number;
  totalEnrolled: number;
  totalAvailable: number;
  overallOccupancy: number;
  runningCount: number;
  upcomingCount: number;
  completedCount: number;
  courseStreamStats: { course: string; count: number; students: number; revenue: number }[];
} => {
  const staffMap = new Map<string, string>();
  (staffList || []).forEach(s => staffMap.set(s.id, s.full_name || s.username || 'Tutor'));

  // Pre-index installments by student ID
  const installmentsByStudent = new Map<string, number>();
  (installments || []).forEach(inst => {
    const sId = inst.student_id;
    const current = installmentsByStudent.get(sId) || 0;
    installmentsByStudent.set(sId, current + (Number(inst.amount_paid) || 0));
  });

  // Pre-index students by batch ID
  const studentsByBatch = new Map<string, any[]>();
  (students || []).forEach(s => {
    const bId = s.batch_id || 'unassigned';
    if (!studentsByBatch.has(bId)) {
      studentsByBatch.set(bId, []);
    }
    studentsByBatch.get(bId)!.push(s);
  });

  let totalSeats = 0;
  let totalEnrolled = 0;
  let runningCount = 0;
  let upcomingCount = 0;
  let completedCount = 0;

  const courseMap = new Map<string, { count: number; students: number; revenue: number }>();

  const batchMetrics: AcademyBatchMetric[] = (batches || []).map(b => {
    const bStudents = studentsByBatch.get(b.id) || [];
    const capacity = Number(b.total_seats) || 30;
    const enrolled = bStudents.length;
    const remaining = Math.max(0, capacity - enrolled);
    const occupancyRate = capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0;

    const rawStatus = (b.status || 'Upcoming').toLowerCase();
    let statusFormatted = 'Upcoming';
    if (rawStatus === 'running' || rawStatus === 'ongoing' || rawStatus === 'active') {
      statusFormatted = 'Running';
      runningCount++;
    } else if (rawStatus === 'completed' || rawStatus === 'finished') {
      statusFormatted = 'Completed';
      completedCount++;
    } else {
      statusFormatted = 'Upcoming';
      upcomingCount++;
    }

    totalSeats += capacity;
    totalEnrolled += enrolled;

    // Financial totals for this batch (excluding discontinued balances from active pending)
    let batchFees = 0;
    let batchCollected = 0;
    let batchPending = 0;
    bStudents.forEach(st => {
      const paid = installmentsByStudent.get(st.id) || 0;
      const fin = getStudentFinancialState(st, paid);
      batchFees += fin.effectiveExpectedFee;
      batchCollected += paid;
      batchPending += fin.pendingDue;
    });
    const collectionRate = batchFees > 0 ? Math.round((batchCollected / batchFees) * 100) : 0;

    const courseName = b.course_name || b.batch_name || 'General Course';
    const cStat = courseMap.get(courseName) || { count: 0, students: 0, revenue: 0 };
    cStat.count += 1;
    cStat.students += enrolled;
    cStat.revenue += batchFees;
    courseMap.set(courseName, cStat);

    return {
      id: b.id,
      batch_name: b.batch_name,
      batch_code: b.batch_code || (b.batch_name ? b.batch_name.slice(0, 4).toUpperCase() : 'BTCH'),
      course_name: courseName,
      mode: (b.mode || b.batch_type || '').toLowerCase() === 'online' ? 'Online' : 'Offline',
      status: statusFormatted,
      start_date: b.start_date || (b.created_at ? b.created_at.slice(0, 10) : '-'),
      total_seats: capacity,
      enrolled_count: enrolled,
      remaining_seats: remaining,
      occupancy_rate: occupancyRate,
      tutor_id: b.tutor_id,
      tutor_name: b.tutor_id ? staffMap.get(b.tutor_id) || 'Assigned Tutor' : 'Not Assigned',
      total_fees: batchFees,
      total_collected: batchCollected,
      total_pending: batchPending,
      collection_rate: collectionRate
    };
  });

  const totalAvailable = Math.max(0, totalSeats - totalEnrolled);
  const overallOccupancy = totalSeats > 0 ? Math.round((totalEnrolled / totalSeats) * 100) : 0;

  const courseStreamStats = Array.from(courseMap.entries()).map(([course, stat]) => ({
    course,
    count: stat.count,
    students: stat.students,
    revenue: stat.revenue
  })).sort((a, b) => b.students - a.students);

  return {
    batchMetrics,
    totalSeats,
    totalEnrolled,
    totalAvailable,
    overallOccupancy,
    runningCount,
    upcomingCount,
    completedCount,
    courseStreamStats
  };
};

/**
 * Computes Financial & Fee Collection Analytics
 */
export const computeFinancialAnalytics = (
  students: any[],
  installments: any[]
): AcademyFinancialAnalytics => {
  let total_expected_fees = 0;
  let total_collected = 0;
  let total_written_off = 0;

  // Map student collected amounts
  const paidByStudent = new Map<string, number>();
  (installments || []).forEach(inst => {
    const sId = inst.student_id;
    const amt = Number(inst.amount_paid) || 0;
    paidByStudent.set(sId, (paidByStudent.get(sId) || 0) + amt);
    total_collected += amt;
  });

  (students || []).forEach(s => {
    const paid = paidByStudent.get(s.id) || 0;
    const fin = getStudentFinancialState(s, paid);
    total_expected_fees += fin.effectiveExpectedFee;
    total_written_off += fin.writtenOffAmount;
  });

  const total_pending = Math.max(0, total_expected_fees - total_collected);
  const recovery_rate = total_expected_fees > 0
    ? Math.round((total_collected / total_expected_fees) * 100)
    : 0;

  const activeStudentsCount = (students || []).length;
  const average_revenue_per_student = activeStudentsCount > 0
    ? Math.round(total_expected_fees / activeStudentsCount)
    : 0;

  // Payment methods breakdown
  const methodMap = new Map<string, { amount: number; count: number }>();
  (installments || []).forEach(inst => {
    const method = (inst.payment_method || 'UPI').toUpperCase();
    const amt = Number(inst.amount_paid) || 0;
    const current = methodMap.get(method) || { amount: 0, count: 0 };
    current.amount += amt;
    current.count += 1;
    methodMap.set(method, current);
  });

  const payment_methods = Array.from(methodMap.entries()).map(([name, data]) => ({
    name,
    amount: data.amount,
    count: data.count,
    percentage: total_collected > 0 ? Math.round((data.amount / total_collected) * 100) : 0
  })).sort((a, b) => b.amount - a.amount);

  // Fee clearance aging (strictly excludes Discontinued debt from overdue / critical buckets)
  let clearedCount = 0, clearedFees = 0, clearedPaid = 0;
  let inProgressCount = 0, inProgressFees = 0, inProgressPaid = 0;
  let criticalCount = 0, criticalFees = 0, criticalPaid = 0;

  (students || []).forEach(s => {
    const paid = paidByStudent.get(s.id) || 0;
    const fin = getStudentFinancialState(s, paid);

    if (fin.isDiscontinued) {
      // Discontinued students have zero active collectible debt
      if (paid > 0) {
        clearedCount++;
        clearedFees += paid;
        clearedPaid += paid;
      }
      return;
    }

    const total = fin.nominalTotalFee;
    const ratio = total > 0 ? (paid / total) : (paid > 0 ? 1 : 0);

    if (ratio >= 0.999 || (total > 0 && paid >= total)) {
      clearedCount++;
      clearedFees += total;
      clearedPaid += paid;
    } else if (ratio >= 0.5) {
      inProgressCount++;
      inProgressFees += total;
      inProgressPaid += paid;
    } else {
      criticalCount++;
      criticalFees += total;
      criticalPaid += paid;
    }
  });

  // Monthly collection trend (sorted chronologically by canonical payment month)
  const monthMap = new Map<string, { amount: number; count: number }>();
  (installments || []).forEach(inst => {
    const monthKey = getCollectionMonthKey(inst);
    const amt = Number(inst.amount_paid || inst.amount) || 0;
    const current = monthMap.get(monthKey) || { amount: 0, count: 0 };
    current.amount += amt;
    current.count += 1;
    monthMap.set(monthKey, current);
  });

  const monthly_trend = Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      amount: data.amount,
      count: data.count
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    total_expected_fees,
    total_collected,
    total_pending,
    recovery_rate,
    average_revenue_per_student,
    discontinued_unrealized_fees: total_written_off,
    payment_methods,
    fee_aging: {
      cleared: {
        count: clearedCount,
        total_fees: clearedFees,
        paid_fees: clearedPaid
      },
      in_progress: {
        count: inProgressCount,
        total_fees: inProgressFees,
        paid_fees: inProgressPaid,
        pending_fees: Math.max(0, inProgressFees - inProgressPaid)
      },
      critical: {
        count: criticalCount,
        total_fees: criticalFees,
        paid_fees: criticalPaid,
        pending_fees: Math.max(0, criticalFees - criticalPaid)
      }
    },
    monthly_trend
  };
};

/**
 * Computes Staff (Counselor & Tutor) Performance Metrics
 */
export const computeStaffPerformanceMetrics = (
  students: any[],
  installments: any[],
  batches: any[],
  attendances: any[],
  staffList: any[],
  targets: AcademyPerformanceTargets
): {
  counselorMetrics: AcademyCounselorMetric[];
  tutorMetrics: AcademyTutorMetric[];
} => {
  // Pre-index installments by student
  const studentPaidMap = new Map<string, number>();
  (installments || []).forEach(inst => {
    const sId = inst.student_id;
    studentPaidMap.set(sId, (studentPaidMap.get(sId) || 0) + (Number(inst.amount_paid) || 0));
  });

  // Identify Counselors
  const counselorStaff = (staffList || []).filter(s =>
    (s.designation || '').toLowerCase().includes('counselor')
  );

  // Group students by counselor
  const studentsByCounselor = new Map<string, any[]>();
  (students || []).forEach(s => {
    const cId = s.counselor_id || 'direct';
    if (!studentsByCounselor.has(cId)) {
      studentsByCounselor.set(cId, []);
    }
    studentsByCounselor.get(cId)!.push(s);
  });

  const counselorMetrics: AcademyCounselorMetric[] = counselorStaff.map(c => {
    const cStudents = studentsByCounselor.get(c.id) || [];
    const count = cStudents.length;
    const target = targets.custom_counselor_targets?.[c.id] || targets.counselor_admissions_target || 10;
    const achievementRate = target > 0 ? Math.round((count / target) * 100) : 0;

    let booked = 0;
    let upfront = 0;
    let pending = 0;
    cStudents.forEach(st => {
      const paid = studentPaidMap.get(st.id) || 0;
      const fin = getStudentFinancialState(st, paid);
      booked += fin.effectiveExpectedFee;
      upfront += paid;
      pending += fin.pendingDue;
    });
    const collectionRate = booked > 0 ? Math.round((upfront / booked) * 100) : 0;

    return {
      id: c.id,
      counselor_name: c.full_name || c.username || 'Counselor',
      admissions_count: count,
      target_admissions: target,
      achievement_rate: achievementRate,
      total_fees_booked: booked,
      upfront_cash_collected: upfront,
      pending_collections: pending,
      collection_rate: collectionRate
    };
  }).sort((a, b) => b.admissions_count - a.admissions_count);

  // Identify Tutors
  const tutorStaff = (staffList || []).filter(s =>
    (s.designation || '').toLowerCase().includes('tutor') ||
    (s.designation || '').toLowerCase().includes('faculty') ||
    (s.designation || '').toLowerCase().includes('trainer') ||
    (s.designation || '').toLowerCase().includes('instructor')
  );

  // Group batches by tutor
  const batchesByTutor = new Map<string, any[]>();
  (batches || []).forEach(b => {
    if (b.tutor_id) {
      if (!batchesByTutor.has(b.tutor_id)) batchesByTutor.set(b.tutor_id, []);
      batchesByTutor.get(b.tutor_id)!.push(b);
    }
  });

  // Attendance index by batch
  const attendanceByBatch = new Map<string, { present: number; total: number }>();
  (attendances || []).forEach(att => {
    const bId = att.batch_id;
    const curr = attendanceByBatch.get(bId) || { present: 0, total: 0 };
    curr.total += 1;
    if ((att.status || '').toLowerCase() === 'present') curr.present += 1;
    attendanceByBatch.set(bId, curr);
  });

  const tutorMetrics: AcademyTutorMetric[] = tutorStaff.map(t => {
    const tBatches = batchesByTutor.get(t.id) || [];
    const bCount = tBatches.length;

    let studentCount = 0;
    let totalPresent = 0;
    let totalAttendanceRecords = 0;
    let discontinuedCount = 0;

    tBatches.forEach(b => {
      const bStudents = (students || []).filter(s => s.batch_id === b.id);
      studentCount += bStudents.length;
      discontinuedCount += bStudents.filter(s => s.status === 'Discontinued').length;

      const attStat = attendanceByBatch.get(b.id);
      if (attStat) {
        totalPresent += attStat.present;
        totalAttendanceRecords += attStat.total;
      }
    });

    const averageAttendanceRate = totalAttendanceRecords > 0
      ? Math.round((totalPresent / totalAttendanceRecords) * 100)
      : 0;

    const targetAttendanceRate = targets.custom_tutor_targets?.[t.id] || targets.tutor_attendance_target || 90;
    const retentionRate = studentCount > 0
      ? Math.round(((studentCount - discontinuedCount) / studentCount) * 100)
      : 100;

    return {
      id: t.id,
      tutor_name: t.full_name || t.username || 'Tutor',
      batches_count: bCount,
      active_students_count: studentCount,
      total_classes_marked: totalAttendanceRecords,
      average_attendance_rate: averageAttendanceRate,
      target_attendance_rate: targetAttendanceRate,
      retention_rate: retentionRate
    };
  }).sort((a, b) => b.active_students_count - a.active_students_count);

  return {
    counselorMetrics,
    tutorMetrics
  };
};

export interface AcademyMasterDataset {
  batches: any[];
  students: any[];
  installments: any[];
  attendances: any[];
  staffList: any[];
}

export const fetchAcademyMasterDataset = async (): Promise<AcademyMasterDataset> => {
  try {
    const [bRes, stRes, sRes, fRes, aRes] = await Promise.all([
      supabase.from('batches').select('*').order('created_at', { ascending: false }),
      supabase.from('staff_profiles').select('id, full_name, designation, username').order('full_name'),
      supabase.from('students').select('*').order('created_at', { ascending: false }),
      supabase.from('fee_collections').select('*').order('created_at', { ascending: false }),
      supabase.from('student_attendance').select('*').order('attendance_date', { ascending: false })
    ]);

    let bList = bRes.data || [];
    let stList = stRes.data || [];
    let sList = sRes.data || [];
    let fList = fRes.data || [];
    let aList = aRes.data || [];

    // Proxy fallbacks if anon client hits RLS
    if (bList.length === 0 || stList.length === 0 || sList.length === 0 || fList.length === 0) {
      try {
        const [pb, pst, ps, pf, pa] = await Promise.all([
          bList.length === 0 ? fetch('/supabase-admin/rest/v1/batches?select=*&order=created_at.desc').then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve(bList),
          stList.length === 0 ? fetch('/supabase-admin/rest/v1/staff_profiles?select=id,full_name,designation,username&order=full_name.asc').then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve(stList),
          sList.length === 0 ? fetch('/supabase-admin/rest/v1/students?select=*&order=created_at.desc').then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve(sList),
          fList.length === 0 ? fetch('/supabase-admin/rest/v1/fee_collections?select=*&order=created_at.desc').then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve(fList),
          aList.length === 0 ? fetch('/supabase-admin/rest/v1/student_attendance?select=*&order=attendance_date.desc').then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve(aList)
        ]);
        if (bList.length === 0 && Array.isArray(pb) && pb.length > 0) bList = pb;
        if (stList.length === 0 && Array.isArray(pst) && pst.length > 0) stList = pst;
        if (sList.length === 0 && Array.isArray(ps) && ps.length > 0) sList = ps;
        if (fList.length === 0 && Array.isArray(pf) && pf.length > 0) fList = pf;
        if (aList.length === 0 && Array.isArray(pa) && pa.length > 0) aList = pa;
      } catch (err) {
        console.warn('Proxy fetch fallback in fetchAcademyMasterDataset:', err);
      }
    }

    // Normalized Batches
    const batches = bList.map((b: any) => ({
      id: b.id,
      batch_name: b.batch_name,
      batch_code: b.batch_code || (b.batch_name ? b.batch_name.slice(0, 4).toUpperCase() : 'BTCH'),
      batch_type: b.mode === 'online' ? 'Online' : 'Offline',
      mode: b.mode === 'online' ? 'Online' : 'Offline',
      course_name: b.course_name || b.batch_name,
      status: b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : 'Upcoming',
      tutor_id: b.tutor_id,
      created_at: b.created_at,
      start_date: b.start_date || (b.created_at ? b.created_at.slice(0, 10) : ''),
      total_seats: Number(b.total_seats) || 30,
      fee_amount: Number(b.fee_amount) || 25000
    }));

    const staffMap = new Map<string, string>();
    stList.forEach((st: any) => staffMap.set(st.id, st.full_name));

    const batchesMap = new Map<string, any>();
    batches.forEach((b: any) => batchesMap.set(b.id, b));

    // Normalized Students
    const students = sList.map((s: any) => {
      const isDiscontinued = isStudentDiscontinued(s);
      const cleanCode = s.student_id_code?.replace(/\s*\[DISCONTINUED\]/g, '') || `STU-${s.id.slice(0, 4)}`;
      const assignedBatch = batchesMap.get(s.batch_id);
      const counselorName = s.counselor_id ? staffMap.get(s.counselor_id) || 'Assigned Counselor' : 'Direct / Admin';
      const isBatchCompleted = (assignedBatch?.status || '').toLowerCase() === 'completed';
      const isStudentCompleted = isBatchCompleted || (s.status || '').toLowerCase() === 'completed';

      return {
        id: s.id,
        registration_number: cleanCode,
        student_name: s.name,
        name: s.name,
        email: s.email || '',
        phone: s.phone || '',
        batch_id: s.batch_id,
        batch: assignedBatch,
        counselor_id: s.counselor_id,
        counselor_name: counselorName,
        total_fees: Number(s.total_fee) || 0,
        status: isDiscontinued ? 'Discontinued' : isStudentCompleted ? 'Completed' : 'Active',
        created_at: s.created_at,
        enrollment_date: s.enrollment_date || (s.created_at ? s.created_at.slice(0, 10) : '')
      };
    });

    // Normalized Installments
    const installments = fList.map((f: any) => {
      let proofUrl = f.payment_proof_url || f.proof_url || f.slip_url || '';
      let cleanNotes = f.notes || '';
      if (!proofUrl && cleanNotes.includes('[Slip:')) {
        const match = cleanNotes.match(/\[Slip:\s*([^\]]+)\]/);
        if (match) {
          proofUrl = match[1].trim();
          cleanNotes = cleanNotes.replace(/\[Slip:\s*[^\]]+\]/, '').trim();
        }
      }
      return {
        id: f.id,
        student_id: f.student_id,
        batch_id: f.batch_id,
        collected_by: f.collected_by,
        amount_paid: Number(f.amount) || 0,
        amount: Number(f.amount) || 0,
        installment_month: f.installment_month,
        payment_date: f.created_at ? f.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        payment_method: f.payment_mode ? f.payment_mode.toUpperCase() : 'ONLINE',
        payment_mode: f.payment_mode,
        notes: cleanNotes,
        proof_url: proofUrl,
        created_at: f.created_at
      };
    });

    // Normalized Attendance
    const attendances = aList.map((a: any) => ({
      ...a,
      status: (a.status || '').toLowerCase() === 'present' ? 'Present' : 'Absent'
    }));

    return {
      batches,
      students,
      installments,
      attendances,
      staffList: stList
    };
  } catch (err) {
    console.error('Error fetching master dataset in academyMetricsService:', err);
    return {
      batches: [],
      students: [],
      installments: [],
      attendances: [],
      staffList: []
    };
  }
};
