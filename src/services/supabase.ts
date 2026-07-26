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
