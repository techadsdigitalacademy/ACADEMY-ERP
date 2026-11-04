export interface CompanyHoliday {
  id: string;
  holiday_date: string; // YYYY-MM-DD
  holiday_name: string;
  created_by?: string;
  created_at?: string;
}

const STORAGE_KEY = 'tech_ads_company_holidays';
const STORAGE_FILE = 'company_holidays.json';

/**
 * Fetch all registered office holidays from Supabase Storage and localStorage
 */
export async function fetchCompanyHolidays(): Promise<CompanyHoliday[]> {
  let list: CompanyHoliday[] = [];

  // 1. Try local cache first for instant UI response
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    }
  } catch (_) {}

  // 2. Fetch latest from Supabase Storage via admin proxy (bypasses RLS)
  try {
    let res = await fetch(`/supabase-admin/storage/v1/object/public/attendance/${STORAGE_FILE}`, { cache: 'no-cache' });
    if (!res.ok) {
      res = await fetch(`/supabase-admin/storage/v1/object/attendance/${STORAGE_FILE}`, { cache: 'no-cache' });
    }
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        list = data;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('Company holidays fetch notice:', err);
  }

  // Deduplicate by holiday_date
  const uniqueMap = new Map<string, CompanyHoliday>();
  list.forEach(h => {
    if (h.holiday_date) {
      uniqueMap.set(h.holiday_date, h);
    }
  });

  return Array.from(uniqueMap.values()).sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
}

/**
 * Save holidays list to Supabase Storage and localStorage
 */
export async function saveCompanyHolidays(holidays: CompanyHoliday[]): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holidays));
  } catch (_) {}

  const jsonBlob = JSON.stringify(holidays);

  try {
    const proxyRes = await fetch(`/supabase-admin/storage/v1/object/attendance/${STORAGE_FILE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-upsert': 'true'
      },
      body: jsonBlob
    });

    if (!proxyRes.ok) {
      console.warn('Proxy holiday save notice:', proxyRes.statusText);
    }
  } catch (err) {
    console.warn('Holiday save notice:', err);
  }

  window.dispatchEvent(new CustomEvent('company_holidays_changed', { detail: holidays }));
}

/**
 * Add a new office holiday
 */
export async function addCompanyHoliday(
  holiday_date: string,
  holiday_name: string,
  created_by?: string
): Promise<CompanyHoliday[]> {
  const current = await fetchCompanyHolidays();
  const existingIdx = current.findIndex(h => h.holiday_date === holiday_date);

  const newHoliday: CompanyHoliday = {
    id: `hol-${Date.now()}`,
    holiday_date,
    holiday_name: holiday_name.trim(),
    created_by: created_by || 'Admin',
    created_at: new Date().toISOString()
  };

  let updated: CompanyHoliday[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = newHoliday;
  } else {
    updated = [...current, newHoliday];
  }

  updated.sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
  await saveCompanyHolidays(updated);
  return updated;
}

/**
 * Delete an office holiday
 */
export async function deleteCompanyHoliday(idOrDate: string): Promise<CompanyHoliday[]> {
  const current = await fetchCompanyHolidays();
  const updated = current.filter(h => h.id !== idOrDate && h.holiday_date !== idOrDate);
  await saveCompanyHolidays(updated);
  return updated;
}

