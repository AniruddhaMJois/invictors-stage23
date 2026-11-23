import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getTeamGroup, TeamGroupConfig } from './gameData';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key-here')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface TeamRecord {
  id?: string;
  team_name: string;
  team_number: number;
  members: string[];
  assigned_group_id: number;
  assigned_original_string: string;
  assigned_fragment_code: string;
  assigned_secret_word: string;
  assigned_final_codeword: string;
  quest_started_at?: string | null;
  stage2_started_at?: string | null;
  stage2_solved: boolean;
  stage2_solved_at?: string | null;
  stage2_duration_seconds?: number | null;
  stage3_started_at?: string | null;
  stage3_solved: boolean;
  stage3_submission?: string | null;
  stage3_solved_at?: string | null;
  stage3_duration_seconds?: number | null;
  stage4_started_at?: string | null;
  stage4_solved: boolean;
  stage4_submission?: string | null;
  stage4_solved_at?: string | null;
  stage4_duration_seconds?: number | null;
  total_duration_seconds?: number | null;
  current_stage: number;
  created_at?: string;
  updated_at?: string;
}

// Local storage key for offline/fallback caching
const LOCAL_STORAGE_TEAMS_KEY = 'cipher_quest_teams_cache';
const LOCAL_STORAGE_LOGS_KEY = 'cipher_quest_logs_cache';

// Helper to format seconds into readable "Xm Ys" or "Xs"
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

// Helper for live stopwatch timer "HH:MM:SS"
export function formatStopwatchTime(totalSeconds: number): string {
  if (totalSeconds < 0 || isNaN(totalSeconds)) return '00:00:00';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Fetch existing team data by team name or team number
export async function fetchTeamData(teamName: string, teamNumber: number): Promise<TeamRecord | null> {
  const normalizedName = teamName.trim();

  // Try Supabase first if available
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .or(`team_name.ilike.${normalizedName},team_number.eq.${teamNumber}`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data as TeamRecord;
      }
    } catch (err) {
      console.warn('Error fetching team from Supabase:', err);
    }
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_TEAMS_KEY);
      if (stored) {
        const cache: Record<string, TeamRecord> = JSON.parse(stored);
        const match = Object.values(cache).find(
          (t) => t.team_number === teamNumber || t.team_name.toLowerCase() === normalizedName.toLowerCase()
        );
        if (match) return match;
      }
    } catch (e) {
      console.warn('Failed reading localStorage', e);
    }
  }

  return null;
}

// Upsert team registration
export async function syncTeamRegistration(
  teamName: string,
  teamNumber: number,
  members: string[]
): Promise<TeamRecord> {
  const group: TeamGroupConfig = getTeamGroup(teamNumber);
  const normalizedName = teamName.trim();

  // Check if team already exists
  const existing = await fetchTeamData(normalizedName, teamNumber);

  const teamData: TeamRecord = {
    team_name: normalizedName,
    team_number: teamNumber,
    members: members.filter(Boolean),
    assigned_group_id: group.groupId,
    assigned_original_string: group.originalString,
    assigned_fragment_code: group.fragmentCode,
    assigned_secret_word: group.secretWord,
    assigned_final_codeword: group.finalCodeword,
    quest_started_at: existing?.quest_started_at || null,
    stage2_started_at: existing?.stage2_started_at || null,
    stage2_solved: existing?.stage2_solved || false,
    stage2_solved_at: existing?.stage2_solved_at || null,
    stage2_duration_seconds: existing?.stage2_duration_seconds || null,
    stage3_started_at: existing?.stage3_started_at || null,
    stage3_solved: existing?.stage3_solved || false,
    stage3_submission: existing?.stage3_submission || null,
    stage3_solved_at: existing?.stage3_solved_at || null,
    stage3_duration_seconds: existing?.stage3_duration_seconds || null,
    stage4_started_at: existing?.stage4_started_at || null,
    stage4_solved: existing?.stage4_solved || false,
    stage4_submission: existing?.stage4_submission || null,
    stage4_solved_at: existing?.stage4_solved_at || null,
    stage4_duration_seconds: existing?.stage4_duration_seconds || null,
    total_duration_seconds: existing?.total_duration_seconds || null,
    current_stage: existing?.current_stage || 2,
  };

  // Upsert to Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('teams')
        .upsert(teamData, { onConflict: 'team_name' })
        .select()
        .single();

      if (error) {
        console.error('Supabase upsert team error:', error);
      } else if (data) {
        await logActivity(normalizedName, teamNumber, 1, 'TEAM_REGISTER', {
          members,
          resumed: !!existing,
          groupId: group.groupId,
        });
        return data as TeamRecord;
      }
    } catch (err) {
      console.error('Failed to sync team to Supabase:', err);
    }
  }

  // Backup in localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_TEAMS_KEY) || '{}';
      const cache = JSON.parse(stored);
      cache[normalizedName.toLowerCase()] = teamData;
      localStorage.setItem(LOCAL_STORAGE_TEAMS_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn('Failed writing to localStorage', e);
    }
  }

  await logActivity(normalizedName, teamNumber, 1, 'TEAM_REGISTER_LOCAL', {
    members,
    resumed: !!existing,
  });

  return teamData;
}

// Record starting of Stage 2 (Starts the global quest timer as soon as user enters Stage 2)
export async function recordStage2Start(
  teamName: string,
  teamNumber: number
): Promise<TeamRecord | null> {
  const existing = await fetchTeamData(teamName, teamNumber);
  if (existing?.quest_started_at && existing?.stage2_started_at) {
    return existing;
  }

  const now = new Date().toISOString();
  const updates = {
    quest_started_at: existing?.quest_started_at || now,
    stage2_started_at: existing?.stage2_started_at || now,
  };

  if (supabase) {
    try {
      await supabase
        .from('teams')
        .update(updates)
        .eq('team_name', teamName);
    } catch (err) {
      console.warn('Error starting stage 2 timer in Supabase:', err);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_TEAMS_KEY) || '{}';
      const cache = JSON.parse(stored);
      if (cache[teamName.toLowerCase()]) {
        cache[teamName.toLowerCase()].quest_started_at = updates.quest_started_at;
        cache[teamName.toLowerCase()].stage2_started_at = updates.stage2_started_at;
        localStorage.setItem(LOCAL_STORAGE_TEAMS_KEY, JSON.stringify(cache));
      }
    } catch (e) {
      console.warn('Failed updating local storage', e);
    }
  }

  await logActivity(teamName, teamNumber, 2, 'STAGE2_STARTED', {
    started_at: now,
  });

  return existing ? { ...existing, ...updates } : null;
}

// Log actions into team-specific activity logs tables in Supabase (e.g. team_1_logs, team_2_logs, etc.)
export async function logActivity(
  teamName: string,
  teamNumber: number,
  stage: number,
  actionType: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const logEntry = {
    team_name: teamName,
    team_number: teamNumber,
    stage,
    action_type: actionType,
    details,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      // Use team-specific table via RPC procedure
      const { error: rpcError } = await supabase.rpc('log_team_activity', {
        p_team_number: teamNumber,
        p_team_name: teamName,
        p_stage: stage,
        p_action_type: actionType,
        p_details: details,
      });

      if (rpcError) {
        // Fallback to team-specific table directly if exists
        await supabase.from(`team_${teamNumber}_logs`).insert(logEntry);
      }
    } catch (err) {
      console.warn('Failed to insert team activity log:', err);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const teamLogKey = `${LOCAL_STORAGE_LOGS_KEY}_team_${teamNumber}`;
      const logsRaw = localStorage.getItem(teamLogKey) || '[]';
      const logs = JSON.parse(logsRaw);
      logs.push(logEntry);
      if (logs.length > 200) logs.shift();
      localStorage.setItem(teamLogKey, JSON.stringify(logs));
    } catch (e) {
      console.warn('Failed saving log locally', e);
    }
  }
}

// Fetch individual team activity logs arranged and sorted by timestamp
export async function fetchTeamLogs(teamNumber: number): Promise<unknown[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(`team_${teamNumber}_logs`)
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data) return data;
    } catch (err) {
      console.warn('Error fetching team logs:', err);
    }
  }
  if (typeof window !== 'undefined') {
    try {
      const teamLogKey = `${LOCAL_STORAGE_LOGS_KEY}_team_${teamNumber}`;
      const logsRaw = localStorage.getItem(teamLogKey) || '[]';
      const logs = JSON.parse(logsRaw);
      return logs.sort(
        (a: { created_at: string }, b: { created_at: string }) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } catch {
      // ignore
    }
  }
  return [];
}

// Update Stage 2 completion: computes duration and sets Stage 3 start
export async function recordStage2Completion(
  teamName: string,
  teamNumber: number,
  solvedString: string
): Promise<TeamRecord | null> {
  const existing = await fetchTeamData(teamName, teamNumber);
  const now = new Date().toISOString();

  const startIso = existing?.stage2_started_at || existing?.quest_started_at || now;
  const stage2Duration = Math.max(1, Math.round((new Date(now).getTime() - new Date(startIso).getTime()) / 1000));

  const updates = {
    stage2_solved: true,
    stage2_solved_at: now,
    stage2_duration_seconds: stage2Duration,
    stage3_started_at: now,
    current_stage: 3,
  };

  if (supabase) {
    try {
      await supabase
        .from('teams')
        .update(updates)
        .eq('team_name', teamName);
    } catch (err) {
      console.error('Error recording Stage 2 in Supabase:', err);
    }
  }

  // Update local cache
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_TEAMS_KEY) || '{}';
      const cache = JSON.parse(stored);
      if (cache[teamName.toLowerCase()]) {
        Object.assign(cache[teamName.toLowerCase()], updates);
        localStorage.setItem(LOCAL_STORAGE_TEAMS_KEY, JSON.stringify(cache));
      }
    } catch (e) {
      console.warn('Error updating local cache', e);
    }
  }

  // Only one log entry for Stage 2 as requested
  await logActivity(teamName, teamNumber, 2, 'FINAL_ANSWER_GENERATED', {
    message: 'final answer is generated by this team',
    solvedString,
    duration_seconds: stage2Duration,
    timestamp: now,
  });

  return existing ? { ...existing, ...updates } : null;
}

// Update Stage 3 completion: computes duration and sets Stage 4 start
export async function recordStage3Completion(
  teamName: string,
  teamNumber: number,
  submissionText: string,
  assignedCodeword: string
): Promise<TeamRecord | null> {
  const existing = await fetchTeamData(teamName, teamNumber);
  const now = new Date().toISOString();

  const startIso = existing?.stage3_started_at || existing?.stage2_solved_at || now;
  const stage3Duration = Math.max(1, Math.round((new Date(now).getTime() - new Date(startIso).getTime()) / 1000));

  const updates = {
    stage3_solved: true,
    stage3_submission: submissionText,
    stage3_solved_at: now,
    stage3_duration_seconds: stage3Duration,
    stage4_started_at: now,
    current_stage: 4,
  };

  if (supabase) {
    try {
      await supabase
        .from('teams')
        .update(updates)
        .eq('team_name', teamName);
    } catch (err) {
      console.error('Error recording Stage 3 in Supabase:', err);
    }
  }

  // Update local cache
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_TEAMS_KEY) || '{}';
      const cache = JSON.parse(stored);
      if (cache[teamName.toLowerCase()]) {
        Object.assign(cache[teamName.toLowerCase()], updates);
        localStorage.setItem(LOCAL_STORAGE_TEAMS_KEY, JSON.stringify(cache));
      }
    } catch (e) {
      console.warn('Error updating local cache', e);
    }
  }

  await logActivity(teamName, teamNumber, 3, 'STAGE3_SOLVED', {
    submissionText,
    assignedCodeword,
    duration_seconds: stage3Duration,
    timestamp: now,
  });

  return existing ? { ...existing, ...updates } : null;
}

// Update Stage 4 completion: computes stage 4 duration and total quest duration
export async function recordStage4Completion(
  teamName: string,
  teamNumber: number,
  flagSubmission: string
): Promise<TeamRecord | null> {
  const existing = await fetchTeamData(teamName, teamNumber);
  const now = new Date().toISOString();

  const stage4StartIso = existing?.stage4_started_at || existing?.stage3_solved_at || now;
  const stage4Duration = Math.max(1, Math.round((new Date(now).getTime() - new Date(stage4StartIso).getTime()) / 1000));

  const questStartIso = existing?.quest_started_at || existing?.stage2_started_at || now;
  const totalDuration = Math.max(1, Math.round((new Date(now).getTime() - new Date(questStartIso).getTime()) / 1000));

  const updates = {
    stage4_solved: true,
    stage4_submission: flagSubmission,
    stage4_solved_at: now,
    stage4_duration_seconds: stage4Duration,
    total_duration_seconds: totalDuration,
  };

  if (supabase) {
    try {
      await supabase
        .from('teams')
        .update(updates)
        .eq('team_name', teamName);
    } catch (err) {
      console.error('Error recording Stage 4 in Supabase:', err);
    }
  }

  // Update local cache
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_TEAMS_KEY) || '{}';
      const cache = JSON.parse(stored);
      if (cache[teamName.toLowerCase()]) {
        Object.assign(cache[teamName.toLowerCase()], updates);
        localStorage.setItem(LOCAL_STORAGE_TEAMS_KEY, JSON.stringify(cache));
      }
    } catch (e) {
      console.warn('Error updating local cache', e);
    }
  }

  await logActivity(teamName, teamNumber, 4, 'STAGE4_FLAG_CAPTURED', {
    flag: flagSubmission,
    stage4_duration_seconds: stage4Duration,
    total_duration_seconds: totalDuration,
    timestamp: now,
  });

  return existing ? { ...existing, ...updates } : null;
}
