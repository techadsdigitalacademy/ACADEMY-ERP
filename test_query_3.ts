import { createClient } from "@supabase/supabase-js";
const supabase = createClient("https://oxlcmtytydtudsdjsixh.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94bGNtdHl0eWR0dWRzZGpzaXhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjkyNjI2MSwiZXhwIjoyMDk4NTAyMjYxfQ.7eUOKeCNgj0jqrVOYGldSCxQEZUl64mzHz-TlkoneB4");

async function run() {
  const { data: tables, error } = await supabase.rpc('get_tables'); // Or some query if possible, or just try querying settings
  console.log("RPC Error:", error);
  const { data } = await supabase.from("finance_settings").select("*").limit(1);
  console.log("finance_settings:", data);
}

run();
