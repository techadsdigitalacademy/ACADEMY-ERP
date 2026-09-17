import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oxlcmtytydtudsdjsixh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2ojRmy5ZwCsaGn9chslteg_JDFzr6ot';

const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

/**
 * Explicit column list for `sales` queries.
 *
 * `select('*')` pulls `payment_proof_url`, which historically stored full
 * base64 image data URLs and dominated every response. List and aggregation
 * views never read it, so they use this list; the two views that open a slip
 * preview append `, payment_proof_url` themselves.
 */
export const SALES_COLUMNS =
  'id, staff_id, client_name, service_package, payment_type, package_amount, received_amount, balance_amount, sale_month, payment_method, work_description, created_at';

/**
 * Start of the 12-month window the dashboards can actually display.
 *
 * Every month selector is built from `getMonthOptions()`, which offers exactly
 * 12 entries, so list queries are bounded to this window instead of pulling
 * full history on every fetch. `setDate(1)` runs before `setMonth` so the
 * subtraction cannot roll an extra month forward when today is the 29th-31st.
 */
export const monthWindowStart = (): string => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 11);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

/**
 * Explicit column list for `staff_profiles` list queries.
 *
 * `select('*')` also returns `password`, a plaintext credential that list and
 * directory views never read. Only the login fallback and the edit flow need it,
 * and both fetch it for a single row. Keep it out of anything that returns many
 * rows -- it is both wasted egress and every staff member's password sitting in
 * an admin's browser.
 */
export const STAFF_PROFILE_COLUMNS =
  'id, auth_user_id, avatar_url, full_name, designation, username, gender, shift_start_time, shift_end_time, weekly_off_day, created_at, base_salary, status';
