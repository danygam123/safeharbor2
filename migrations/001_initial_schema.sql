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

CREATE TABLE IF NOT EXISTS public.volunteer_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  url TEXT,
  audience TEXT,
  description TEXT,
  author_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
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
ALTER TABLE public.volunteer_submissions ENABLE ROW LEVEL SECURITY;

-- profiles: own row only; users can NEVER grant themselves is_admin
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

-- volunteer_submissions: anyone signed in can submit; owners see their own; admins see/manage all
DROP POLICY IF EXISTS vs_insert ON public.volunteer_submissions;
DROP POLICY IF EXISTS vs_select ON public.volunteer_submissions;
DROP POLICY IF EXISTS vs_admin_update ON public.volunteer_submissions;
CREATE POLICY vs_insert ON public.volunteer_submissions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY vs_select ON public.volunteer_submissions FOR SELECT
  USING (user_id = auth.uid() OR status = 'approved' OR public.is_admin());
CREATE POLICY vs_admin_update ON public.volunteer_submissions FOR UPDATE
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ───────────────────────── To make yourself an admin (run manually, once) ─────────────────────────
-- UPDATE public.profiles SET is_admin = TRUE WHERE id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
