import { createClient } from "@supabase/supabase-js";

// Supabase client for Google sign-in (see pages/Login.tsx). Null when the
// VITE_SUPABASE_* vars are unset, which is the local-dev path: the API accepts a
// DEV_USER_ID bypass, so no session is required and the app skips the login screen.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  url && anonKey ? createClient(url, anonKey) : null;
