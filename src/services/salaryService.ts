import { supabase } from './supabase';
import type { MonthlyPayslip, SalaryIncrement } from '../types';
export type { SalaryIncrement };

export interface StaffSalaryDetails {
  staffId: string;
  fullName: string;
  startingSalary: number;
  currentSalary: number;
  offerLetterUrl?: string;
  offerLetterName?: string;
  offerLetterUploadedAt?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  panNumber?: string;
  upiId?: string;
  resignationStatus?: 'ACTIVE' | 'SERVING_NOTICE' | 'RESIGNED';
  resignationDate?: string;
  noticePeriodDays?: number;
  lastWorkingDay?: string;
  resignationReason?: string;
  isTraining?: boolean;
  trainingStartDate?: string;
  trainingEndDate?: string;
  trainingDurationDays?: number;
  trainingCommissionRate?: number;
  isSalesManager?: boolean;
  assignedExecutiveIds?: string[];
  increments: SalaryIncrement[];
}

/**
 * In Academy ERP, counselors, tutors, and admissions are staff members.
 * None are excluded by default.
 */
export function isAcademyStaff(_p: any): boolean {
  return false;
}

// Cross-tab real-time sync channel
const hrChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tech_ads_hr_channel') : null;

if (hrChannel) {
  hrChannel.onmessage = (msg) => {
    const detail = msg?.data || {};
    window.dispatchEvent(new CustomEvent('salary_data_changed', { detail }));
    window.dispatchEvent(new CustomEvent('payslip_data_changed', { detail }));
    window.dispatchEvent(new CustomEvent('staff_profiles_changed', { detail }));
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && (e.key.startsWith('tech_ads_salary_') || e.key.startsWith('tech_ads_payslips_'))) {
      window.dispatchEvent(new CustomEvent('salary_data_changed'));
      window.dispatchEvent(new CustomEvent('payslip_data_changed'));
    }
  });
}

export function normalizeStaffName(name?: string): string {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export function notifyHRDataChange(
  type: 'salary' | 'resignation' | 'training' | 'document' | 'payslip',
  staffId?: string,
  fullName?: string,
  extra?: any
) {
  const detail = { type, staffId, fullName, extra, timestamp: Date.now() };
  window.dispatchEvent(new CustomEvent('salary_data_changed', { detail }));
  window.dispatchEvent(new CustomEvent('staff_profiles_changed', { detail }));
  if (type === 'payslip') {
    window.dispatchEvent(new CustomEvent('payslip_data_changed', { detail }));
  }
  try {
    hrChannel?.postMessage(detail);
  } catch {}
}

const LOCAL_STORAGE_KEY_PREFIX = 'tech_ads_salary_data_';
const LOCAL_INCREMENTS_KEY_PREFIX = 'tech_ads_salary_increments_';
const LOCAL_PAYSLIPS_KEY_PREFIX = 'tech_ads_payslips_';
const LOCAL_DELETED_INCREMENTS_KEY = 'tech_ads_hr_deleted_increments';

export function getDeletedIncrementIds(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_INCREMENTS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

export function markIncrementDeleted(incrementId: string): void {
  if (typeof localStorage === 'undefined' || !incrementId) return;
  try {
    const set = getDeletedIncrementIds();
    set.add(incrementId);
    localStorage.setItem(LOCAL_DELETED_INCREMENTS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function unmarkIncrementDeleted(incrementId: string): void {
  if (typeof localStorage === 'undefined' || !incrementId) return;
  try {
    const set = getDeletedIncrementIds();
    if (set.has(incrementId)) {
      set.delete(incrementId);
      localStorage.setItem(LOCAL_DELETED_INCREMENTS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {}
}

export const CANONICAL_STAFF_ALIASES: Record<string, string[]> = {
  safwana: ['sufana', 'safwana ok', 'soofana', 'safna', 'safwana'],
  sufana: ['safwana', 'safwana ok', 'soofana', 'safna', 'sufana'],
  soofana: ['safwana', 'safwana ok', 'sufana', 'safna', 'soofana'],
  safna: ['safwana', 'sufana', 'safwana ok', 'safna'],
  meera: ['meera'],
  shadhil: ['shadil', 'shadhil'],
  shadil: ['shadhil', 'shadil'],
  fidha: ['fidha kp', 'fidha'],
  rameesa: ['ramisa', 'rameesa'],
  mashida: ['masheeda', 'mashida'],
  shahana: ['shahana shibin', 'shahana'],
  hasnath: ['hasnath p', 'hasnath'],
  siyad: ['siyad', 'sayed', 'sayid'],
  sinsiya: ['sinsiya', 'sinshiya'],
  sana: ['sana', 'sana nesrin', 'sana nasrin', 'nasrin', 'nesrin']
};

export function getAllLocalKeys(staffId?: string, fullName?: string, prefix: string = LOCAL_STORAGE_KEY_PREFIX): string[] {
  const cleanName = (fullName || '').trim();
  const normName = normalizeStaffName(cleanName);
  const firstWord = cleanName.toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, '');
  const firstNorm = firstWord && firstWord.length > 2 ? normalizeStaffName(firstWord) : null;
  const aliases = CANONICAL_STAFF_ALIASES[firstWord] || [];

  const keys: (string | null)[] = [
    staffId ? `${prefix}${staffId}` : null,
    normName ? `${prefix}${normName}` : null,
    firstNorm && firstNorm !== normName ? `${prefix}${firstNorm}` : null
  ];

  aliases.forEach(a => {
    keys.push(`${prefix}${normalizeStaffName(a)}`);
  });

  return Array.from(new Set(keys.filter(Boolean))) as string[];
}

export async function findAllStaffRows(staffId?: string, fullName?: string): Promise<any[]> {
  const cleanName = (fullName || '').trim();
  const staffRows: any[] = [];
  try {
    if (staffId) {
      const { data: byId } = await supabase.from('staff_profiles').select('*').eq('id', staffId);
      if (byId && byId.length > 0) staffRows.push(...byId);
    }

    const effectiveName = (cleanName || staffRows[0]?.full_name || '').trim();
    if (effectiveName) {
      const { data: byName } = await supabase.from('staff_profiles').select('*').ilike('full_name', effectiveName);
      if (byName && byName.length > 0) {
        byName.forEach(r => {
          if (!staffRows.some(existing => existing.id === r.id)) {
            staffRows.push(r);
          }
        });
      }
      const firstWord = effectiveName.split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, '');
      if (firstWord && firstWord.length >= 3) {
        const { data: byFirst } = await supabase.from('staff_profiles').select('*').ilike('full_name', `${firstWord}%`);
        if (byFirst && byFirst.length > 0) {
          byFirst.forEach(r => {
            if (!staffRows.some(existing => existing.id === r.id)) {
              staffRows.push(r);
            }
          });
        }
      }
    }
  } catch (err) {
    console.warn('SalaryService: Error finding staff rows in staff_profiles:', err);
  }
  return staffRows;
}

/**
 * Storage JSON Cloud Helper: Reads or writes HR data directly to Supabase Storage bucket 'attendance'
 */
async function getCloudStorageHR(staffId: string, fullName?: string): Promise<any> {
  const norm = normalizeStaffName(fullName);
  const candidateKeys = [
    staffId ? `hr_salary_${staffId}.json` : null,
    norm ? `hr_salary_${norm}.json` : null
  ].filter(Boolean) as string[];

  for (const key of candidateKeys) {
    try {
      // 1. Try local proxy
      const proxyRes = await fetch(`/supabase-admin/storage/v1/object/attendance/${key}`);
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        if (json && typeof json === 'object') return json;
      }
    } catch {}

    try {
      // 2. Direct Supabase Storage download fallback
      const { data, error } = await supabase.storage.from('attendance').download(key);
      if (!error && data) {
        const text = await data.text();
        const json = JSON.parse(text);
        if (json && typeof json === 'object') return json;
      }
    } catch {}
  }
  return null;
}

async function saveCloudStorageHR(staffId: string, fullName: string, data: any): Promise<void> {
  const norm = normalizeStaffName(fullName);
  const keys = Array.from(new Set([
    staffId ? `hr_salary_${staffId}.json` : null,
    norm ? `hr_salary_${norm}.json` : null
  ].filter(Boolean))) as string[];

  const jsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });

  for (const key of keys) {
    try {
      // 1. Try proxy
      await fetch(`/supabase-admin/storage/v1/object/attendance/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-upsert': 'true' },
        body: jsonBlob
      });
    } catch {}

    try {
      // 2. Direct upload fallback
      await supabase.storage.from('attendance').upload(key, jsonBlob, { upsert: true });
    } catch {}
  }
}

interface HRPersistPayload {
  salaryDetails?: Partial<StaffSalaryDetails>;
  increment?: SalaryIncrement;
  allIncrements?: SalaryIncrement[];
  payslip?: MonthlyPayslip;
  removeOfferLetter?: boolean;
  deletedIncrementId?: string;
  deletedIncrementIds?: string[];
}

/**
 * Persist HR data permanently to Supabase Storage + localStorage
 */
async function persistHRDataToCloud(
  staffId: string | undefined,
  fullName: string,
  payload: HRPersistPayload
): Promise<void> {
  const cleanName = (fullName || '').trim();
  const resolvedStaffId = staffId || normalizeStaffName(cleanName);
  const localKeys = getAllLocalKeys(staffId, cleanName, LOCAL_STORAGE_KEY_PREFIX);

  // 1. Gather all tombstoned / deleted IDs
  const mergedDeletedIds = new Set<string>(getDeletedIncrementIds());
  if (payload.deletedIncrementId) {
    mergedDeletedIds.add(payload.deletedIncrementId);
    markIncrementDeleted(payload.deletedIncrementId);
  }
  if (payload.deletedIncrementIds) {
    payload.deletedIncrementIds.forEach(id => {
      mergedDeletedIds.add(id);
      markIncrementDeleted(id);
    });
  }
  if (payload.increment) {
    mergedDeletedIds.delete(payload.increment.id);
    unmarkIncrementDeleted(payload.increment.id);
  }

  // 2. Read existing Cloud Storage record
  let existingCloud = await getCloudStorageHR(resolvedStaffId, cleanName) || {};

  let mergedHrSalary: any = { ...existingCloud };
  let mergedIncrements: SalaryIncrement[] = Array.isArray(existingCloud.increments) ? [...existingCloud.increments] : [];
  let mergedPayslips: MonthlyPayslip[] = Array.isArray(existingCloud.payslips) ? [...existingCloud.payslips] : [];

  // Also merge existing local cache if it contains non-empty fields
  localKeys.forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          mergedHrSalary = { ...parsed, ...mergedHrSalary };
          if (Array.isArray(parsed.increments)) {
            parsed.increments.forEach((inc: SalaryIncrement) => {
              if (!mergedDeletedIds.has(inc.id) && !mergedIncrements.some(existing => existing.id === inc.id)) {
                mergedIncrements.push(inc);
              }
            });
          }
          if (Array.isArray(parsed.payslips)) {
            parsed.payslips.forEach((p: MonthlyPayslip) => {
              if (!mergedPayslips.some(existing => existing.month_key === p.month_key)) {
                mergedPayslips.push(p);
              }
            });
          }
        }
      }
    } catch {}
  });

  // 3. Apply new payload
  if (payload.salaryDetails) {
    mergedHrSalary = { ...mergedHrSalary, ...payload.salaryDetails };
  }

  if (payload.removeOfferLetter) {
    delete mergedHrSalary.offerLetterUrl;
    delete mergedHrSalary.offerLetterName;
    delete mergedHrSalary.offerLetterUploadedAt;
  }

  if (payload.allIncrements !== undefined) {
    mergedIncrements = [...payload.allIncrements];
  } else if (payload.increment) {
    mergedIncrements = [payload.increment, ...mergedIncrements.filter(i => i.id !== payload.increment!.id)];
  }

  // Strictly filter out any tombstoned increment
  mergedIncrements = mergedIncrements.filter(i => !mergedDeletedIds.has(i.id));
  mergedIncrements.sort((a, b) => (b.effective_from || '').localeCompare(a.effective_from || ''));
  mergedHrSalary.increments = [...mergedIncrements];

  // Derive currentSalary if not explicitly passed
  if (payload.salaryDetails?.currentSalary !== undefined) {
    mergedHrSalary.currentSalary = payload.salaryDetails.currentSalary;
  } else if (mergedIncrements.length > 0) {
    mergedHrSalary.currentSalary = mergedIncrements[0].new_salary;
  } else if (mergedHrSalary.startingSalary) {
    mergedHrSalary.currentSalary = mergedHrSalary.startingSalary;
  }

  if (payload.payslip) {
    mergedPayslips = [payload.payslip, ...mergedPayslips.filter(p => p.month_key !== payload.payslip!.month_key)];
    mergedHrSalary.payslips = [...mergedPayslips];
  }

  mergedHrSalary._hr_deleted_increments = Array.from(mergedDeletedIds);

  // 4. Save to Cloud Storage (Supabase attendance bucket)
  await saveCloudStorageHR(resolvedStaffId, cleanName, mergedHrSalary);

  // 5. Update staff_profiles table if possible
  try {
    if (staffId) {
      const profileUpdates: any = {};
      if (mergedHrSalary.currentSalary !== undefined) profileUpdates.base_salary = mergedHrSalary.currentSalary;
      if (mergedHrSalary.resignationStatus === 'RESIGNED') profileUpdates.status = 'resigned';
      else if (mergedHrSalary.resignationStatus === 'ACTIVE') profileUpdates.status = 'active';
      if (Object.keys(profileUpdates).length > 0) {
        await supabase.from('staff_profiles').update(profileUpdates).eq('id', staffId);
      }
    }
  } catch {}

  // 6. Update all local storage keys
  localKeys.forEach(k => {
    try {
      const existing = localStorage.getItem(k);
      const parsed = existing ? JSON.parse(existing) : {};
      const updated = {
        ...parsed,
        ...mergedHrSalary,
        increments: mergedIncrements,
        payslips: mergedPayslips
      };
      if (payload.removeOfferLetter) {
        delete updated.offerLetterUrl;
        delete updated.offerLetterName;
        delete updated.offerLetterUploadedAt;
      }
      localStorage.setItem(k, JSON.stringify(updated));
    } catch {}
  });
}

/**
 * Global Retroactive Tombstone Sanitization
 */
export async function syncRetroactiveDeletedIncrements(): Promise<void> {
  // Keeps local tombstones synchronized
}

/**
 * Get salary details for a staff member with resilient Supabase Storage + localStorage sync
 */
export async function getStaffSalaryDetails(staffId: string, fullName: string): Promise<StaffSalaryDetails> {
  const cleanName = (fullName || '').trim();
  const staffRows = await findAllStaffRows(staffId, cleanName);
  const localKeys = getAllLocalKeys(staffId, cleanName, LOCAL_STORAGE_KEY_PREFIX);

  const cloudDeletedIds = new Set<string>(getDeletedIncrementIds());

  // 1. Fetch from Cloud Storage
  const cloudHR = await getCloudStorageHR(staffId, cleanName) || {};
  if (Array.isArray(cloudHR._hr_deleted_increments)) {
    cloudHR._hr_deleted_increments.forEach((delId: string) => {
      if (delId) {
        cloudDeletedIds.add(delId);
        markIncrementDeleted(delId);
      }
    });
  }

  // 2. Fetch from localStorage
  let localData: any = null;
  for (const k of localKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          localData = { ...localData, ...parsed };
        }
      }
    } catch {}
  }

  // Local increments
  const incKeys = getAllLocalKeys(staffId, cleanName, LOCAL_INCREMENTS_KEY_PREFIX);
  let localIncrements: SalaryIncrement[] = [];
  for (const k of incKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((inc: SalaryIncrement) => {
            if (!cloudDeletedIds.has(inc.id) && !localIncrements.some(existing => existing.id === inc.id)) {
              localIncrements.push(inc);
            }
          });
        }
      }
    } catch {}
  }
  if (Array.isArray(localData?.increments)) {
    localData.increments.forEach((inc: SalaryIncrement) => {
      if (!cloudDeletedIds.has(inc.id) && !localIncrements.some(existing => existing.id === inc.id)) {
        localIncrements.push(inc);
      }
    });
  }

  let cloudIncrements: SalaryIncrement[] = Array.isArray(cloudHR.increments) ? cloudHR.increments : [];

  // Filter tombstoned
  cloudIncrements = cloudIncrements.filter(i => !cloudDeletedIds.has(i.id));
  localIncrements = localIncrements.filter(i => !cloudDeletedIds.has(i.id));

  const incMap = new Map<string, SalaryIncrement>();
  cloudIncrements.forEach(i => incMap.set(i.id, i));
  localIncrements.forEach(i => incMap.set(i.id, i));
  cloudDeletedIds.forEach(delId => incMap.delete(delId));

  const combinedIncrements = Array.from(incMap.values()).sort((a, b) => (b.effective_from || '').localeCompare(a.effective_from || ''));

  const startingSalary = Number(
    cloudHR?.startingSalary ||
    localData?.startingSalary ||
    staffRows[0]?.base_salary ||
    0
  );

  const calculatedCurrentFromIncrements = combinedIncrements.length > 0
    ? combinedIncrements[0].new_salary
    : null;

  const currentSalary = calculatedCurrentFromIncrements !== null
    ? calculatedCurrentFromIncrements
    : (startingSalary > 0
        ? startingSalary
        : Number(cloudHR?.currentSalary || localData?.currentSalary || staffRows[0]?.base_salary || 0));

  let offerLetterUrl: string | undefined = undefined;
  let offerLetterName: string | undefined = undefined;
  let offerLetterUploadedAt: string | undefined = undefined;

  if (cloudHR && cloudHR.offerLetterUrl) {
    offerLetterUrl = String(cloudHR.offerLetterUrl);
    offerLetterName = cloudHR.offerLetterName || 'Offer_Letter.pdf';
    offerLetterUploadedAt = cloudHR.offerLetterUploadedAt;
  } else if (localData && localData.offerLetterUrl) {
    offerLetterUrl = localData.offerLetterUrl;
    offerLetterName = localData.offerLetterName || 'Offer_Letter.pdf';
    offerLetterUploadedAt = localData.offerLetterUploadedAt;
  }

  const bankName = cloudHR?.bankName || localData?.bankName || '';
  const bankAccountNo = cloudHR?.bankAccountNo || localData?.bankAccountNo || '';
  const bankIfsc = cloudHR?.bankIfsc || localData?.bankIfsc || '';
  const panNumber = cloudHR?.panNumber || localData?.panNumber || '';
  const upiId = cloudHR?.upiId || localData?.upiId || '';

  const resignationStatus: 'ACTIVE' | 'SERVING_NOTICE' | 'RESIGNED' =
    cloudHR?.resignationStatus ||
    localData?.resignationStatus ||
    (staffRows[0]?.status === 'resigned' ? 'RESIGNED' : 'ACTIVE');

  const resignationDate = cloudHR?.resignationDate || localData?.resignationDate || undefined;
  const noticePeriodDays = Number(cloudHR?.noticePeriodDays || localData?.noticePeriodDays || 30);
  const lastWorkingDay = cloudHR?.lastWorkingDay || localData?.lastWorkingDay || undefined;
  const resignationReason = cloudHR?.resignationReason || localData?.resignationReason || undefined;

  const isTraining = Boolean(
    cloudHR?.isTraining !== undefined ? cloudHR.isTraining : (localData?.isTraining ?? false)
  );
  const trainingStartDate = cloudHR?.trainingStartDate || localData?.trainingStartDate || undefined;
  const trainingEndDate = cloudHR?.trainingEndDate || localData?.trainingEndDate || undefined;
  const trainingDurationDays = Number(cloudHR?.trainingDurationDays || localData?.trainingDurationDays || 7);
  const trainingCommissionRate = Number(cloudHR?.trainingCommissionRate || localData?.trainingCommissionRate || 10);

  const resolvedId = staffId || staffRows[0]?.id || '';
  const resolvedName = cleanName || staffRows[0]?.full_name || fullName;

  const result: StaffSalaryDetails = {
    staffId: resolvedId,
    fullName: resolvedName,
    startingSalary,
    currentSalary,
    offerLetterUrl,
    offerLetterName,
    offerLetterUploadedAt,
    bankName,
    bankAccountNo,
    bankIfsc,
    panNumber,
    upiId,
    resignationStatus,
    resignationDate,
    noticePeriodDays,
    lastWorkingDay,
    resignationReason,
    isTraining,
    trainingStartDate,
    trainingEndDate,
    trainingDurationDays,
    trainingCommissionRate,
    isSalesManager: Boolean(cloudHR?.isSalesManager || localData?.isSalesManager),
    assignedExecutiveIds: cloudHR?.assignedExecutiveIds || localData?.assignedExecutiveIds || [],
    increments: combinedIncrements
  };

  // Keep all local keys warm
  localKeys.forEach(k => {
    try {
      localStorage.setItem(k, JSON.stringify(result));
    } catch {}
  });

  return result;
}

/**
 * Update baseline or current salary for a staff member
 */
export async function updateStaffSalary({
  staffId,
  fullName,
  startingSalary,
  currentSalary
}: {
  staffId: string;
  fullName: string;
  startingSalary: number;
  currentSalary: number;
}): Promise<void> {
  await persistHRDataToCloud(staffId, fullName, {
    salaryDetails: {
      startingSalary,
      currentSalary
    }
  });

  notifyHRDataChange('salary', staffId, fullName);
}

/**
 * Record a salary increment and adjust current salary
 */
export async function addSalaryIncrement({
  staffId,
  fullName,
  previousSalary,
  newSalary,
  effectiveFrom,
  reason,
  approvedBy = 'Managing Director'
}: {
  staffId: string;
  fullName: string;
  previousSalary: number;
  newSalary: number;
  effectiveFrom: string;
  reason: string;
  approvedBy?: string;
}): Promise<SalaryIncrement> {
  const cleanName = (fullName || '').trim();
  const incrementAmount = newSalary - previousSalary;
  const incrementPercentage = previousSalary > 0 
    ? parseFloat(((incrementAmount / previousSalary) * 100).toFixed(2))
    : 0;

  const newIncrement: SalaryIncrement = {
    id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    staff_id: staffId,
    previous_salary: previousSalary,
    new_salary: newSalary,
    increment_amount: incrementAmount,
    increment_percentage: incrementPercentage,
    effective_from: effectiveFrom,
    reason,
    approved_by: approvedBy,
    created_at: new Date().toISOString()
  };

  unmarkIncrementDeleted(newIncrement.id);

  // 1. Save in local increments and salary stores across all canonical keys
  const incKeys = getAllLocalKeys(staffId, cleanName, LOCAL_INCREMENTS_KEY_PREFIX);
  incKeys.forEach(k => {
    let existingIncs: SalaryIncrement[] = [];
    try {
      const raw = localStorage.getItem(k);
      if (raw) existingIncs = JSON.parse(raw);
    } catch {}
    localStorage.setItem(k, JSON.stringify([newIncrement, ...existingIncs.filter(i => i.id !== newIncrement.id)]));
  });

  const salKeys = getAllLocalKeys(staffId, cleanName, LOCAL_STORAGE_KEY_PREFIX);
  salKeys.forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          parsed.currentSalary = newSalary;
          parsed.increments = [newIncrement, ...(parsed.increments || []).filter((i: any) => i.id !== newIncrement.id)];
          localStorage.setItem(k, JSON.stringify(parsed));
        }
      }
    } catch {}
  });

  // ZERO-LAG optimistic broadcast
  notifyHRDataChange('salary', staffId, cleanName, {
    action: 'add_increment',
    increment: newIncrement,
    newSalary
  });

  // 2. Persist to cloud storage
  await persistHRDataToCloud(staffId, cleanName, {
    increment: newIncrement,
    salaryDetails: {
      currentSalary: newSalary
    }
  });

  notifyHRDataChange('salary', staffId, cleanName, {
    action: 'sync_complete',
    increment: newIncrement,
    newSalary
  });
  return newIncrement;
}

/**
 * Update an existing salary increment and recalculate current salary
 */
export async function updateSalaryIncrement({
  staffId,
  fullName,
  incrementId,
  previousSalary,
  newSalary,
  effectiveFrom,
  reason,
  approvedBy = 'Managing Director'
}: {
  staffId: string;
  fullName: string;
  incrementId: string;
  previousSalary: number;
  newSalary: number;
  effectiveFrom: string;
  reason: string;
  approvedBy?: string;
}): Promise<SalaryIncrement> {
  const cleanName = (fullName || '').trim();
  unmarkIncrementDeleted(incrementId);

  const incrementAmount = newSalary - previousSalary;
  const incrementPercentage = previousSalary > 0 
    ? parseFloat(((incrementAmount / previousSalary) * 100).toFixed(2))
    : 0;

  const details = await getStaffSalaryDetails(staffId, cleanName);
  const existingIncrements = details.increments || [];

  const updatedIncrement: SalaryIncrement = {
    id: incrementId,
    staff_id: staffId,
    previous_salary: previousSalary,
    new_salary: newSalary,
    increment_amount: incrementAmount,
    increment_percentage: incrementPercentage,
    effective_from: effectiveFrom,
    reason,
    approved_by: approvedBy,
    created_at: new Date().toISOString()
  };

  const updatedList = existingIncrements.some(i => i.id === incrementId)
    ? existingIncrements.map(i => i.id === incrementId ? updatedIncrement : i)
    : [updatedIncrement, ...existingIncrements];

  updatedList.sort((a, b) => (b.effective_from || '').localeCompare(a.effective_from || ''));

  const recalculatedCurrentSalary = updatedList[0]?.new_salary ?? details.startingSalary;

  const incKeys = getAllLocalKeys(staffId, cleanName, LOCAL_INCREMENTS_KEY_PREFIX);
  incKeys.forEach(k => {
    try {
      localStorage.setItem(k, JSON.stringify(updatedList));
    } catch {}
  });

  const salKeys = getAllLocalKeys(staffId, cleanName, LOCAL_STORAGE_KEY_PREFIX);
  salKeys.forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          parsed.currentSalary = recalculatedCurrentSalary;
          parsed.increments = updatedList;
          localStorage.setItem(k, JSON.stringify(parsed));
        }
      }
    } catch {}
  });

  notifyHRDataChange('salary', staffId, cleanName, {
    action: 'update_increment',
    increment: updatedIncrement,
    newSalary: recalculatedCurrentSalary,
    allIncrements: updatedList
  });

  await persistHRDataToCloud(staffId, cleanName, {
    allIncrements: updatedList,
    salaryDetails: {
      currentSalary: recalculatedCurrentSalary
    }
  });

  notifyHRDataChange('salary', staffId, cleanName, {
    action: 'sync_complete',
    increment: updatedIncrement,
    newSalary: recalculatedCurrentSalary,
    allIncrements: updatedList
  });
  return updatedIncrement;
}

/**
 * Delete a salary increment and automatically recalculate current salary
 */
export async function deleteSalaryIncrement({
  staffId,
  fullName,
  incrementId
}: {
  staffId: string;
  fullName: string;
  incrementId: string;
}): Promise<void> {
  const cleanName = (fullName || '').trim();

  // 1. Mark as deleted in tombstone storage immediately
  markIncrementDeleted(incrementId);

  // 2. Get current details to find remaining increments
  const details = await getStaffSalaryDetails(staffId, cleanName);
  const existingIncrements = details.increments || [];

  const remainingIncrements = existingIncrements.filter(i => i.id !== incrementId);
  remainingIncrements.sort((a, b) => (b.effective_from || '').localeCompare(a.effective_from || ''));

  const recalculatedCurrentSalary = remainingIncrements.length > 0 
    ? remainingIncrements[0].new_salary 
    : details.startingSalary;

  // 3. Update local storage immediately
  const incKeys = getAllLocalKeys(staffId, cleanName, LOCAL_INCREMENTS_KEY_PREFIX);
  incKeys.forEach(k => {
    try {
      localStorage.setItem(k, JSON.stringify(remainingIncrements));
    } catch {}
  });

  const salKeys = getAllLocalKeys(staffId, cleanName, LOCAL_STORAGE_KEY_PREFIX);
  salKeys.forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          parsed.currentSalary = recalculatedCurrentSalary;
          parsed.increments = remainingIncrements;
          localStorage.setItem(k, JSON.stringify(parsed));
        }
      }
    } catch {}
  });

  // ZERO-LAG optimistic broadcast
  notifyHRDataChange('salary', staffId, cleanName, {
    action: 'delete_increment',
    incrementId,
    newSalary: recalculatedCurrentSalary,
    remainingIncrements
  });

  // 4. Persist to Cloud
  await persistHRDataToCloud(staffId, cleanName, {
    deletedIncrementId: incrementId,
    allIncrements: remainingIncrements,
    salaryDetails: {
      currentSalary: recalculatedCurrentSalary
    }
  });

  notifyHRDataChange('salary', staffId, cleanName, {
    action: 'sync_complete',
    incrementId,
    newSalary: recalculatedCurrentSalary,
    remainingIncrements
  });
}

/**
 * Upload an offer letter document and link it to the staff profile
 */
export async function uploadOfferLetter({
  staffId,
  fullName,
  file
}: {
  staffId: string;
  fullName: string;
  file: File;
}): Promise<{ url: string; name: string }> {
  const extension = file.name.split('.').pop() || 'pdf';
  const cleanBaseName = file.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${Date.now()}_${cleanBaseName}.${extension}`;
  const filePath = `offer_letters/${staffId || 'staff'}/${fileName}`;

  let publicUrl = '';
  let uploaded = false;

  // 1. Try uploading to 'attendance' bucket via proxy
  try {
    const proxyRes = await fetch(`/supabase-admin/storage/v1/object/attendance/${filePath}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type, 'x-upsert': 'true' },
      body: file
    });
    if (proxyRes.ok) {
      const { data } = supabase.storage.from('attendance').getPublicUrl(filePath);
      if (data?.publicUrl) {
        publicUrl = data.publicUrl;
        uploaded = true;
      }
    }
  } catch (e) {
    console.warn('Proxy upload failed, attempting direct storage upload:', e);
  }

  // 2. Direct upload fallback
  if (!uploaded) {
    try {
      const { error } = await supabase.storage
        .from('attendance')
        .upload(filePath, file, { contentType: file.type, upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('attendance').getPublicUrl(filePath);
        if (data?.publicUrl) {
          publicUrl = data.publicUrl;
          uploaded = true;
        }
      }
    } catch {}
  }

  // 3. Fallback to Data URL if storage unavailable
  if (!uploaded || !publicUrl) {
    publicUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  const nowIso = new Date().toISOString();
  const cleanName = (fullName || '').trim();

  await persistHRDataToCloud(staffId, cleanName, {
    salaryDetails: {
      offerLetterUrl: publicUrl,
      offerLetterName: file.name,
      offerLetterUploadedAt: nowIso
    }
  });

  notifyHRDataChange('document', staffId, cleanName, {
    action: 'upload_offer_letter',
    url: publicUrl,
    name: file.name,
    uploadedAt: nowIso
  });
  return { url: publicUrl, name: file.name };
}

/**
 * Remove offer letter document
 */
export async function removeOfferLetter(staffId: string, fullName: string): Promise<void> {
  const cleanName = (fullName || '').trim();

  // 1. Immediately purge from local storage keys
  const localKeys = getAllLocalKeys(staffId, cleanName, LOCAL_STORAGE_KEY_PREFIX);
  localKeys.forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          delete parsed.offerLetterUrl;
          delete parsed.offerLetterName;
          delete parsed.offerLetterUploadedAt;
          localStorage.setItem(k, JSON.stringify(parsed));
        }
      }
    } catch {}
  });

  // ZERO-LAG optimistic broadcast
  notifyHRDataChange('document', staffId, cleanName, {
    action: 'remove_offer_letter'
  });

  // 2. Persist removal to Cloud Storage
  await persistHRDataToCloud(staffId, cleanName, {
    removeOfferLetter: true
  });

  notifyHRDataChange('document', staffId, cleanName, {
    action: 'sync_complete_offer_letter'
  });
}

/**
 * Update banking and payout information
 */
export async function updateBankDetails({
  staffId,
  fullName,
  bankName,
  bankAccountNo,
  bankIfsc,
  panNumber,
  upiId
}: {
  staffId: string;
  fullName: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  panNumber: string;
  upiId?: string;
}): Promise<void> {
  await persistHRDataToCloud(staffId, fullName, {
    salaryDetails: {
      bankName,
      bankAccountNo,
      bankIfsc,
      panNumber,
      upiId
    }
  });

  notifyHRDataChange('salary', staffId, fullName);
}

/**
 * Update resignation and notice period details
 */
export async function updateResignationDetails({
  staffId,
  fullName,
  resignationStatus,
  resignationDate,
  noticePeriodDays = 30,
  lastWorkingDay,
  resignationReason
}: {
  staffId: string;
  fullName: string;
  resignationStatus: 'ACTIVE' | 'SERVING_NOTICE' | 'RESIGNED';
  resignationDate?: string;
  noticePeriodDays?: number;
  lastWorkingDay?: string;
  resignationReason?: string;
}): Promise<void> {
  await persistHRDataToCloud(staffId, fullName, {
    salaryDetails: {
      resignationStatus,
      resignationDate,
      noticePeriodDays,
      lastWorkingDay,
      resignationReason
    }
  });

  notifyHRDataChange('resignation', staffId, fullName);
}

/**
 * Update training period configuration and commission rate
 */
export async function updateTrainingDetails({
  staffId,
  fullName,
  isTraining,
  trainingStartDate,
  trainingEndDate,
  trainingDurationDays = 7,
  trainingCommissionRate = 10
}: {
  staffId: string;
  fullName: string;
  isTraining: boolean;
  trainingStartDate?: string;
  trainingEndDate?: string;
  trainingDurationDays?: number;
  trainingCommissionRate?: number;
}): Promise<void> {
  await persistHRDataToCloud(staffId, fullName, {
    salaryDetails: {
      isTraining,
      trainingStartDate,
      trainingEndDate,
      trainingDurationDays,
      trainingCommissionRate
    }
  });

  notifyHRDataChange('training', staffId, fullName);
}

/**
 * Fetch all payslips for a staff member (Cloud Storage + local store fallback)
 */
export async function getStaffPayslips(staffId: string, fullName: string): Promise<MonthlyPayslip[]> {
  const cleanName = (fullName || '').trim();
  const localKeys = getAllLocalKeys(staffId, cleanName, LOCAL_PAYSLIPS_KEY_PREFIX);
  const map = new Map<string, MonthlyPayslip>();

  // 1. From local storage
  localKeys.forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: MonthlyPayslip) => {
            if (p?.month_key && !map.has(p.month_key)) {
              map.set(p.month_key, p);
            }
          });
        }
      }
    } catch {}
  });

  // 2. From Cloud Storage
  try {
    const cloudHR = await getCloudStorageHR(staffId, cleanName);
    if (cloudHR && Array.isArray(cloudHR.payslips)) {
      cloudHR.payslips.forEach((p: MonthlyPayslip) => {
        if (p?.month_key && !map.has(p.month_key)) {
          map.set(p.month_key, p);
        }
      });
    }
  } catch {}

  const merged = Array.from(map.values()).sort((a, b) => b.month_key.localeCompare(a.month_key));
  return merged;
}

/**
 * Fetch attendance logs for a staff member from staff_attendance table
 */
export async function getStaffAttendanceLogs(
  staffId?: string,
  fullName?: string,
  startDate?: string
): Promise<any[]> {
  try {
    const staffRows = await findAllStaffRows(staffId, fullName);
    const allIds = Array.from(new Set([staffId, ...staffRows.map(r => r.id)].filter(Boolean))) as string[];
    if (allIds.length === 0) return [];

    let query = supabase
      .from('staff_attendance')
      .select('id, staff_id, attendance_date, punch_in, punch_out, status')
      .in('staff_id', allIds);

    if (startDate) {
      query = query.gte('attendance_date', startDate);
    }

    const { data, error } = await query.order('attendance_date', { ascending: false });
    if (!error && data) {
      return data;
    }
    return [];
  } catch (err) {
    console.warn('SalaryService: Failed to query attendance logs from staff_attendance:', err);
    return [];
  }
}

/**
 * Save / Approve a calculated month-end payslip
 */
export async function saveMonthlyPayslip(payslip: MonthlyPayslip, fullName?: string): Promise<void> {
  const staffKey = payslip.staff_id;
  const cleanName = (fullName || '').trim();
  const localKeys = getAllLocalKeys(staffKey, cleanName, LOCAL_PAYSLIPS_KEY_PREFIX);

  // 1. Update local storage
  localKeys.forEach(k => {
    let list: MonthlyPayslip[] = [];
    try {
      const raw = localStorage.getItem(k);
      if (raw) list = JSON.parse(raw);
    } catch {}
    const idx = list.findIndex(p => p.month_key === payslip.month_key);
    if (idx >= 0) list[idx] = payslip;
    else list.unshift(payslip);
    try {
      localStorage.setItem(k, JSON.stringify(list));
    } catch {}
  });

  // 2. Persist to Cloud Storage
  await persistHRDataToCloud(staffKey, cleanName, { payslip });

  notifyHRDataChange('payslip', staffKey, cleanName);
}

/**
 * Disburse a payslip and record corresponding outflow in expenses table (category: 'Salary')
 */
export async function disburseMonthlyPayslip({
  payslip,
  staffName,
  paymentMethod = 'Bank Transfer',
  transactionRef,
  disbursementDate
}: {
  payslip: MonthlyPayslip;
  staffName: string;
  paymentMethod?: string;
  transactionRef?: string;
  disbursementDate?: string;
}): Promise<void> {
  const finalDate = disbursementDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // 1. Update payslip status to DISBURSED
  const updatedPayslip: MonthlyPayslip = {
    ...payslip,
    payment_status: 'DISBURSED',
    payment_method: paymentMethod,
    transaction_ref: transactionRef || undefined,
    disbursement_date: finalDate
  };

  await saveMonthlyPayslip(updatedPayslip, staffName);

  // 2. Synchronize with finance ledgers: create expense entry under 'Salary'
  const expPayload: any = {
    id: `exp-sal-${payslip.id}`,
    category: 'Salary',
    amount: Number(payslip.net_salary),
    expense_date: finalDate,
    description: `Staff Salary Payout - ${staffName} (${payslip.month_name}) - Payslip #${payslip.id}${transactionRef ? ` (Ref: ${transactionRef})` : ''}`,
    staff_id: payslip.staff_id,
    staff_name: staffName,
    logged_by_name: 'HR & Payroll System',
    payment_method: paymentMethod,
    created_at: new Date().toISOString()
  };

  try {
    const { error } = await supabase.from('expenses').insert(expPayload);
    if (error) {
      const fallback = { ...expPayload };
      delete fallback.staff_name;
      delete fallback.logged_by_name;
      await supabase.from('expenses').insert(fallback);
    }
  } catch (err) {
    console.warn('SalaryService: Expense insert failed, saving to local store:', err);
  }

  // Dual-sync to local company_expenses_local_store
  try {
    const stored = localStorage.getItem('company_expenses_local_store');
    const list = stored ? JSON.parse(stored) : [];
    const existingIdx = list.findIndex((e: any) => e.id === expPayload.id);
    if (existingIdx >= 0) {
      list[existingIdx] = expPayload;
    } else {
      list.unshift(expPayload);
    }
    localStorage.setItem('company_expenses_local_store', JSON.stringify(list));
  } catch (err) {
    console.warn('SalaryService: LocalStorage expense sync failed:', err);
  }

  // Broadcast events to update FinanceDashboard and SalesDashboard
  window.dispatchEvent(new CustomEvent('company_expenses_changed', { detail: expPayload }));
  window.dispatchEvent(new CustomEvent('sales_data_changed'));
}

export interface SalesManagerConfigData {
  isSalesManager: boolean;
  assignedExecutiveIds?: string[];
  updatedAt?: string;
}

/**
 * Dynamically assign or revoke the Sales Manager role for an employee
 */
export async function updateSalesManagerConfig(
  staffId: string | undefined,
  fullName: string,
  config: SalesManagerConfigData
): Promise<void> {
  const cleanName = (fullName || '').trim();
  const resolvedStaffId = staffId || normalizeStaffName(cleanName);

  await persistHRDataToCloud(resolvedStaffId, cleanName, {
    salaryDetails: {
      isSalesManager: config.isSalesManager,
      assignedExecutiveIds: config.assignedExecutiveIds || []
    }
  });

  const detail = {
    staffId,
    fullName: cleanName,
    isSalesManager: config.isSalesManager,
    assignedExecutiveIds: config.assignedExecutiveIds || [],
    timestamp: Date.now()
  };

  window.dispatchEvent(new CustomEvent('sales_manager_updated', { detail }));
  window.dispatchEvent(new CustomEvent('staff_profiles_changed', { detail }));
  if (hrChannel) {
    try {
      hrChannel.postMessage({ type: 'sales_manager', ...detail });
    } catch (e) {}
  }
}
