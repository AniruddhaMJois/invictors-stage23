-- ==============================================================================
-- SUPABASE SCHEMA FOR CIPHER QUEST: STAGES 2, 3 & 4
-- Run this entire script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- Remove legacy activity_logs table (each team has its own separate log table)
DROP TABLE IF EXISTS public.activity_logs CASCADE;

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
    stage4_solved BOOLEAN NOT NULL DEFAULT FALSE,
    stage4_submission TEXT,
    stage4_solved_at TIMESTAMPTZ,
    current_stage INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure stage4 columns exist if table was already created
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS stage4_solved BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stage4_submission TEXT,
ADD COLUMN IF NOT EXISTS stage4_solved_at TIMESTAMPTZ;

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_teams_team_name ON public.teams (LOWER(team_name));
CREATE INDEX IF NOT EXISTS idx_teams_team_number ON public.teams (team_number);

-- 3. Enable Row Level Security (RLS) on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.teams TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Allow anon read teams" ON public.teams;
CREATE POLICY "Allow anon read teams" ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert teams" ON public.teams;
CREATE POLICY "Allow anon insert teams" ON public.teams FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update teams" ON public.teams;
CREATE POLICY "Allow anon update teams" ON public.teams FOR UPDATE USING (true);

-- 4. Dynamic Team-Specific Activity Log Procedure
-- Automatically creates separate 'team_<number>_logs' tables for each team, sorted by timestamp
CREATE OR REPLACE FUNCTION public.log_team_activity(
  p_team_number INT,
  p_team_name TEXT,
  p_stage INT,
  p_action_type TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
) RETURNS void AS $$
DECLARE
  v_table_name text := 'team_' || p_team_number || '_logs';
  v_index_name text := 'idx_team_' || p_team_number || '_logs_created_at';
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS public.%I (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_name TEXT NOT NULL,
      team_number INT NOT NULL,
      stage INT NOT NULL,
      action_type TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT ''{}''::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT timezone(''utc''::text, now())
    )', v_table_name);
  
  -- Index to arrange team logs sorted by timestamp (created_at ASC)
  EXECUTE format('
    CREATE INDEX IF NOT EXISTS %I ON public.%I (created_at ASC)
  ', v_index_name, v_table_name);

  EXECUTE format('
    GRANT ALL ON TABLE public.%I TO anon, authenticated, service_role
  ', v_table_name);

  EXECUTE format('
    ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY
  ', v_table_name);

  BEGIN
    EXECUTE format('
      CREATE POLICY "Allow anon all on %1$s" ON public.%1$I FOR ALL USING (true) WITH CHECK (true);
    ', v_table_name);
  EXCEPTION WHEN duplicate_object THEN
    -- ignore if policy exists
  END;

  EXECUTE format('
    INSERT INTO public.%I (team_name, team_number, stage, action_type, details)
    VALUES ($1, $2, $3, $4, $5)
  ', v_table_name) USING p_team_name, p_team_number, p_stage, p_action_type, p_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.log_team_activity(INT, TEXT, INT, TEXT, JSONB) TO anon, authenticated, service_role;

-- 5. Trigger to auto-update 'updated_at' on teams
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
