-- ==============================================================================
-- SUPABASE SCHEMA FOR CIPHER QUEST: STAGE 2 & STAGE 3
-- Run this entire script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name TEXT NOT NULL UNIQUE,
    team_number INTEGER NOT NULL,
    members TEXT[] NOT NULL DEFAULT '{}',
    assigned_group_id INTEGER NOT NULL,
    assigned_original_string TEXT NOT NULL,
    assigned_fragment_code TEXT NOT NULL,
    assigned_secret_word TEXT NOT NULL,
    assigned_final_codeword TEXT NOT NULL,
    stage2_solved BOOLEAN NOT NULL DEFAULT FALSE,
    stage2_solved_at TIMESTAMPTZ,
    stage3_solved BOOLEAN NOT NULL DEFAULT FALSE,
    stage3_submission TEXT,
    stage3_solved_at TIMESTAMPTZ,
    current_stage INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create Activity Logs Table (Syncs every action, button click, decode attempt, submission)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name TEXT NOT NULL,
    team_number INTEGER NOT NULL,
    stage INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_teams_team_name ON public.teams (LOWER(team_name));
CREATE INDEX IF NOT EXISTS idx_teams_team_number ON public.teams (team_number);
CREATE INDEX IF NOT EXISTS idx_activity_logs_team_name ON public.activity_logs (LOWER(team_name));
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 5. Grant table access to anon, authenticated, and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.teams TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.activity_logs TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. Open RLS Policies for Anon Role (Hackathon/Contest Mode: enables direct sync without complex auth)

DROP POLICY IF EXISTS "Allow anon read teams" ON public.teams;
CREATE POLICY "Allow anon read teams" ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert teams" ON public.teams;
CREATE POLICY "Allow anon insert teams" ON public.teams FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update teams" ON public.teams;
CREATE POLICY "Allow anon update teams" ON public.teams FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow anon insert activity_logs" ON public.activity_logs;
CREATE POLICY "Allow anon insert activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon select activity_logs" ON public.activity_logs;
CREATE POLICY "Allow anon select activity_logs" ON public.activity_logs FOR SELECT USING (true);

-- 6. Trigger to auto-update 'updated_at' on teams
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_teams_modtime ON public.teams;
CREATE TRIGGER update_teams_modtime
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Verification Query:
-- SELECT * FROM public.teams;
-- SELECT * FROM public.activity_logs ORDER BY created_at DESC;
