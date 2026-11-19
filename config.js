// Safe Harbor — External Service Configuration
// ================================================================
// This file is public client configuration and is committed with the app.
// The Supabase anon key is designed for browsers; database security must be
// enforced with Row Level Security. Never put a service-role key or Gemini
// API key in this file.
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
//    Set GEMINI_API_KEY in Vercel Project Settings → Environment Variables.
//    The key is used only by api/chat.js and must never be committed here.
//
// ================================================================

window.SAFEHARBOR_CONFIG = {
  // Supabase project URL, e.g. "https://abcdefghijklmnop.supabase.co"
  SUPABASE_URL: "https://beuieosgrbolesnkgvph.supabase.co/rest/v1/",

  // Supabase anon/public key (safe for client-side use with RLS enabled)
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldWllb3NncmJvbGVzbmtndnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNzMwNzIsImV4cCI6MjEwNzg0OTA3Mn0.NLdkaVenAuTCm1bLHCqNAenpW4GR0g-t5-358EQ8rvE",
};
