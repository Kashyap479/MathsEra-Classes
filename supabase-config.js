/* MathsEra Classes — Supabase Configuration */
(function () {
  "use strict";

  const SUPABASE_URL = "https://fecfemkhfkvprriiyilx.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_kji_NvezSwfQc5PPzmMcfA_aPjMbRHE";

  window.MATHSERA_SUPABASE_URL = SUPABASE_URL;
  window.MATHSERA_SUPABASE_PUBLISHABLE_KEY =
    SUPABASE_PUBLISHABLE_KEY;

  if (!window.supabase) {
    console.error(
      "MathsEra: Supabase CDN load नहीं हुआ."
    );
    return;
  }

  if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );
  }
})();
