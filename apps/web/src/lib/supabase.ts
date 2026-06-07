import { createClient } from "@supabase/supabase-js";

// Wired in but unused in the MVP — there is no login UI yet (spec §12). The API
// accepts a dev-user bypass, so no session is required for local development.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  url && anonKey ? createClient(url, anonKey) : null;
