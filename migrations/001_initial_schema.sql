-- SafeHarbor — 001_initial_schema.sql
-- Run ONCE in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS. It never drops tables or data.

-- ───────────────────────── Tables ─────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  role_preference TEXT DEFAULT 'teen',
  avatar_color TEXT DEFAULT '#6366f1',
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood INT CHECK (mood BETWEEN 1 AND 5),
  stress INT CHECK (stress BETWEEN 1 AND 5),
  support_felt BOOLEAN,
  difficult_day BOOLEAN,
  difficult_day_note TEXT,
  coping_strategy TEXT,
  reflection TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, entry_date)
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  prompt_used TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- local_id lets the Goals drawer (localStorage) mirror its goals here without duplicates
CREATE TABLE IF NOT EXISTS public.personal_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id TEXT,
  text TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','met','unmet')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, local_id)
);

-- ───────────────────────── Helpers ─────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), FALSE);
$$;

-- Real account deletion (cascades to all the user's rows). Callable only by the signed-in user.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- ───────────────────────── Row Level Security ─────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_goals ENABLE ROW LEVEL SECURITY;

-- profiles: own row only; never let a user grant themselves elevated access
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (id = auth.uid() AND is_admin = FALSE);
CREATE POLICY profiles_update ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND is_admin = public.is_admin());

-- checkins / journal / goals: strictly own rows
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['checkins','journal_entries','personal_goals'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      t || '_own', t);
  END LOOP;
END $$;

-- Preserve the admin-role RLS guard for existing database setups.
-- Existing project tables and columns are not destructively removed by this setup migration.
