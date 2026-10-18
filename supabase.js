// supabase.js — Supabase Client Initialization
// Requires: config.js loaded first (defines window.SAFEHARBOR_CONFIG)
// Requires: Supabase CDN script loaded first (defines window.supabase)
//
// Exposes: window.supabaseClient (SupabaseClient | null)
// If credentials are missing/placeholder, supabaseClient is null and all
// personal features gracefully degrade to "sign in required" states.

(function () {
  "use strict";

  const cfg = window.SAFEHARBOR_CONFIG || {};
  // Normalize: strip trailing slashes and an accidental "/rest/v1" (or "/auth/v1") suffix
  const url = (cfg.SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/(rest|auth)\/v1$/, "");
  const key = cfg.SUPABASE_ANON_KEY || "";

  const isConfigured =
    url &&
    key &&
    url !== "YOUR_SUPABASE_URL_HERE" &&
    key !== "YOUR_SUPABASE_ANON_KEY_HERE";

  if (!isConfigured) {
    console.warn(
      "SafeHarbor: Supabase credentials are not configured in config.js. " +
      "Personal features (check-ins, journal, progress, account) are available " +
      "once you add your Supabase project URL and anon key."
    );
    window.supabaseClient = null;
    window.supabaseReady = false;
    return;
  }

  try {
    // window.supabase is the UMD bundle from the CDN script tag
    const { createClient } = window.supabase;
    window.supabaseClient = createClient(url, key, {
      auth: {
        // Persist session in localStorage (Supabase default)
        persistSession: true,
        autoRefreshToken: true,
        // Detect session from URL hash after password reset / OAuth
        detectSessionInUrl: true,
      },
    });
    window.supabaseReady = true;
    console.info("SafeHarbor: Supabase client initialized successfully.");
  } catch (err) {
    console.error("SafeHarbor: Failed to initialize Supabase client.", err);
    window.supabaseClient = null;
    window.supabaseReady = false;
  }
})();
