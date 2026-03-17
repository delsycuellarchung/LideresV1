import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const disableDb = String(process.env.NEXT_PUBLIC_DISABLE_DB || process.env.DISABLE_DB || "").toLowerCase() === "true";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env vars missing. Running without DB (supabase will be null).");
}

// Create client only when both vars are present and DB not disabled.
export const supabase = !disableDb && supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
