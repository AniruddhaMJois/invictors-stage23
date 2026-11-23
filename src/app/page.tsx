'use client';

import React, { useState, useEffect } from 'react';
import TeamRegistration from '@/components/TeamRegistration';
import Stage2 from '@/components/Stage2';
import Stage3 from '@/components/Stage3';
import Stage4 from '@/components/Stage4';
import { TeamRecord } from '@/lib/supabase';
import {
  Shield,
  Users,
  Lock,
  Unlock,
  KeyRound,
  CheckCircle2,
  LogOut,
} from 'lucide-react';

const ACTIVE_TEAM_STORAGE_KEY = 'cipher_quest_active_team';

export default function Home() {
  const [activeTeam, setActiveTeam] = useState<TeamRecord | null>(null);
  const [activeStage, setActiveStage] = useState<2 | 3 | 4>(2);
  const [isClient, setIsClient] = useState(false);

  // Restore stored session on mount
  useEffect(() => {
    setIsClient(true);
    try {
      const saved = localStorage.getItem(ACTIVE_TEAM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setActiveTeam(parsed);
        if (parsed.stage3_solved && !parsed.stage4_solved) {
          setActiveStage(4);
        } else if (parsed.stage2_solved && !parsed.stage3_solved) {
          setActiveStage(3);
        }
      }
    } catch (e) {
      console.warn('Failed restoring active team session', e);
    }
  }, []);

  const handleTeamRegistered = (team: TeamRecord) => {
    setActiveTeam(team);
    try {
      localStorage.setItem(ACTIVE_TEAM_STORAGE_KEY, JSON.stringify(team));
    } catch {
      // ignore
    }
    if (team.stage3_solved) {
      setActiveStage(4);
    } else if (team.stage2_solved) {
      setActiveStage(3);
    } else {
      setActiveStage(2);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(ACTIVE_TEAM_STORAGE_KEY);
    } catch {
      // ignore
    }
    setActiveTeam(null);
    setActiveStage(2);
  };

  const handleStage2Solved = () => {
    if (activeTeam) {
      const updated = {
        ...activeTeam,
        stage2_solved: true,
        current_stage: 3,
      };
      setActiveTeam(updated);
      try {
        localStorage.setItem(ACTIVE_TEAM_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    setActiveStage(3);
  };

  const handleStage3Solved = () => {
    if (activeTeam) {
      const updated = {
        ...activeTeam,
        stage3_solved: true,
        current_stage: 4,
      };
      setActiveTeam(updated);
      try {
        localStorage.setItem(ACTIVE_TEAM_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    setActiveStage(4);
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 font-mono text-sm">
        Initializing Cipher Engine...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-black font-black shadow-lg shadow-cyan-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block leading-none">
                CIPHER QUEST
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                STAGES 2, 3 &amp; 4
              </span>
            </div>
          </div>

          {/* Right Header Statuses */}
          <div className="flex items-center gap-3">
            {activeTeam && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-800/60 text-slate-400 hover:text-rose-300 text-xs font-medium transition cursor-pointer"
                title="Switch Team"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Switch Team</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center relative z-10 py-6">
        {!activeTeam ? (
          <TeamRegistration onTeamRegistered={handleTeamRegistered} />
        ) : (
          <div>
            {/* Active Team Banner & Stage Switcher */}
            <div className="max-w-4xl mx-auto px-4 mb-6">
              <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold font-mono">
                      Active Unit
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-400 font-mono">
                      Group {activeTeam.assigned_group_id}
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-white flex items-center gap-2">
                    {activeTeam.team_name}
                  </h1>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Members: {activeTeam.members.join(', ')}</span>
                  </p>
                </div>

                {/* STAGE SELECTOR TABS (STAGE 2, STAGE 3, and STAGE 4) */}
                <div className="flex flex-wrap items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1 self-start sm:self-auto">
                  {/* Stage 2 Button */}
                  <button
                    type="button"
                    onClick={() => setActiveStage(2)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                      activeStage === 2
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>STAGE 2</span>
                    {activeTeam.stage2_solved && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-950" />
                    )}
                  </button>

                  {/* Stage 3 Button */}
                  <button
                    type="button"
                    onClick={() => setActiveStage(3)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                      activeStage === 3
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {activeTeam.stage2_solved ? (
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>STAGE 3</span>
                    {activeTeam.stage3_solved && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    )}
                  </button>

                  {/* Stage 4 Button */}
                  <button
                    type="button"
                    onClick={() => setActiveStage(4)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                      activeStage === 4
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {activeTeam.stage3_solved ? (
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>STAGE 4</span>
                    {activeTeam.stage4_solved && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Render Active Stage */}
            {activeStage === 2 ? (
              <Stage2 team={activeTeam} onProceedToStage3={handleStage2Solved} />
            ) : activeStage === 3 ? (
              <Stage3
                team={activeTeam}
                onGoToStage2={() => setActiveStage(2)}
                onProceedToStage4={handleStage3Solved}
              />
            ) : (
              <Stage4 team={activeTeam} onGoToStage3={() => setActiveStage(3)} />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <span>Cipher Quest • Live Real-Time Synchronized Engine</span>
        </div>
      </footer>
    </div>
  );
}
