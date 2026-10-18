// Safe Harbor — External Service Configuration
// ================================================================
// IMPORTANT: This file is listed in .gitignore and must NEVER be
// committed to Git or pushed to GitHub. It contains credentials.
// ================================================================
//
// HOW TO FILL THIS IN:
//
// 1. SUPABASE — https://supabase.com
//    a. Create a free project
//    b. Go to Project Settings → API
//    c. Copy the "Project URL" and the "anon / public" key
//    d. In the Supabase SQL Editor, run the file: migrations/001_initial_schema.sql
//
// 2. GEMINI API KEY — https://aistudio.google.com
//    a. Click "Get API key" and create a key for a new project
//    b. Copy the key into GEMINI_API_KEY below
//
// ================================================================

window.SAFEHARBOR_CONFIG = {
  // Supabase project URL, e.g. "https://abcdefghijklmnop.supabase.co"
  SUPABASE_URL: "https://beuieosgrbolesnkgvph.supabase.co/rest/v1/",

  // Supabase anon/public key (safe for client-side use with RLS enabled)
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldWllb3NncmJvbGVzbmtndnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNzMwNzIsImV4cCI6MjEwNzg0OTA3Mn0.NLdkaVenAuTCm1bLHCqNAenpW4GR0g-t5-358EQ8rvE",

  // Google Gemini API key for the AI Companion feature
  // Note: For a public production app, move this to a server-side function.
  // For the Congressional App Challenge demo, this client-side approach is appropriate.
  GEMINI_API_KEY: "YOUR_GEMINI_API_KEY_HERE",
};
