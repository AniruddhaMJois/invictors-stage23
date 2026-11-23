'use client';

import React, { useState } from 'react';
import { extractTeamNumber, getTeamGroup } from '@/lib/gameData';
import { syncTeamRegistration, TeamRecord } from '@/lib/supabase';
import { Users, Shield, ArrowRight, UserPlus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  onTeamRegistered: (team: TeamRecord) => void;
}

export default function TeamRegistration({ onTeamRegistered }: Props) {
  const [teamName, setTeamName] = useState('');
  // 3 compulsory members initially
  const [members, setMembers] = useState<string[]>(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamNumber = extractTeamNumber(teamName);
  const detectedGroup = teamNumber !== null ? getTeamGroup(teamNumber) : null;

  const handleAddMember = () => {
    // Allows adding a 4th member if needed
    if (members.length < 4) {
      setMembers([...members, '']);
    }
  };

  const handleRemoveMember = (index: number) => {
    // Only allow removing the 4th optional member (keep minimum 3 compulsory)
    if (index >= 3) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const handleMemberChange = (index: number, val: string) => {
    const updated = [...members];
    updated[index] = val;
    setMembers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!teamName.trim()) {
      setError('Please enter a team name (e.g. "TEAM 1", "TEAM 2").');
      return;
    }

    if (teamNumber === null || teamNumber < 1) {
      setError('Invalid team name. Please include your team number, e.g. "TEAM 1", "TEAM 5", "TEAM 12".');
      return;
    }

    // Validate 3 compulsory members
    const m1 = members[0]?.trim();
    const m2 = members[1]?.trim();
    const m3 = members[2]?.trim();

    if (!m1 || !m2 || !m3) {
      setError('Members 1, 2, and 3 are compulsory. Please provide names for all 3 members.');
      return;
    }

    const validMembers = members.map((m) => m.trim()).filter(Boolean);

    setLoading(true);
    try {
      const record = await syncTeamRegistration(teamName, teamNumber, validMembers);
      onTeamRegistered(record);
    } catch (err: unknown) {
      console.error(err);
      setError('Failed to register team. Check network or local cache.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
            <Shield className="w-8 h-8" />
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-widest mb-3">
            By INVICTORS
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            FINAL OVERRIDE 2026
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Register your team to initialize your cryptographic sequence for <span className="text-cyan-400 font-semibold">STAGE 2</span>, <span className="text-purple-400 font-semibold">STAGE 3</span>, and <span className="text-rose-400 font-semibold">STAGE 4</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team Name Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Team Designation <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. TEAM 1, TEAM 2, TEAM 7..."
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition text-base font-mono"
                required
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Prompt: Enter team designation formatted as <span className="text-cyan-300 font-medium">TEAM 1</span>, <span className="text-cyan-300 font-medium">TEAM 2</span>, etc.
            </p>

            {/* Live Team Detection preview */}
            {teamNumber !== null && detectedGroup && (
              <div className="mt-2.5 p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/50 flex items-center gap-2 text-xs text-cyan-300">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Detected: <strong className="text-white">Team #{teamNumber}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Team Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Team Members</span>
                <span className="text-xs text-cyan-400 font-normal">(3 compulsory, +1 optional)</span>
              </label>
              {members.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-800/40 transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add 4th Member
                </button>
              )}
            </div>

            <div className="space-y-3">
              {members.map((member, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-24 shrink-0 text-left">
                    <span className="text-xs font-mono text-slate-400">
                      Member #{idx + 1}
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      {idx < 3 ? '(Compulsory)' : '(Optional)'}
                    </span>
                  </div>

                  <input
                    type="text"
                    placeholder={
                      idx < 3
                        ? `Compulsory Member ${idx + 1} Full Name *`
                        : 'Optional 4th Member Full Name'
                    }
                    value={member}
                    onChange={(e) => handleMemberChange(idx, e.target.value)}
                    required={idx < 3}
                    className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  />

                  {idx >= 3 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(idx)}
                      className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                      title="Remove 4th member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 flex items-start gap-3 text-sm text-rose-300">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold tracking-wide shadow-lg shadow-cyan-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Synchronizing with Supabase...
              </span>
            ) : (
              <>
                <span>Access Stages</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
