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
