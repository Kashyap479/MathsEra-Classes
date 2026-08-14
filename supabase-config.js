// MathsEra Classes — shared Supabase configuration
const SUPABASE_URL = "https://fecfemkhfkvprriiyilx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_kji_NvezSwfQc5PPzmMcfA_aPjMbRHE";

// Expose names used by the public pages.
window.MATHSERA_SUPABASE_URL = SUPABASE_URL;
window.MATHSERA_SUPABASE_PUBLISHABLE_KEY = SUPABASE_PUBLISHABLE_KEY;

// Shared client used by Admin and other pages.
window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
