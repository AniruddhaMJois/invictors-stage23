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
  const [members, setMembers] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamNumber = extractTeamNumber(teamName);
  const detectedGroup = teamNumber !== null ? getTeamGroup(teamNumber) : null;

  const handleAddMember = () => {
    if (members.length < 6) {
      setMembers([...members, '']);
    }
  };

  const handleRemoveMember = (index: number) => {
    if (members.length > 1) {
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

    const validMembers = members.map((m) => m.trim()).filter(Boolean);
    if (validMembers.length === 0) {
      setError('Please add at least one team member name.');
      return;
    }

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
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Cipher Quest Portal
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Register your team to initialize your cryptographic sequence for <span className="text-cyan-400 font-semibold">STAGE 2</span> and <span className="text-cyan-400 font-semibold">STAGE 3</span>.
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
                  Detected: <strong className="text-white">Team #{teamNumber}</strong> (Assigned Cipher Group {detectedGroup.groupId})
                </span>
              </div>
            )}
          </div>

          {/* Team Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Team Members <span className="text-cyan-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={members.length >= 6}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-800/40 transition disabled:opacity-40"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Member
              </button>
            </div>

            <div className="space-y-2.5">
              {members.map((member, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 text-xs text-slate-500 font-mono text-right shrink-0">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    placeholder={`Member ${idx + 1} Full Name`}
                    value={member}
                    onChange={(e) => handleMemberChange(idx, e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  />
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(idx)}
                      className="p-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                      title="Remove member"
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

        {/* Quick test preset shortcuts */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-500 mb-3">Quick Presets for Testing:</p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            {[
              { label: 'TEAM 1 (Group 1)', name: 'TEAM 1' },
              { label: 'TEAM 2 (Group 2)', name: 'TEAM 2' },
              { label: 'TEAM 6 (Group 3)', name: 'TEAM 6' },
              { label: 'TEAM 14 (Group 4)', name: 'TEAM 14' },
            ].map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setTeamName(preset.name);
                  setMembers(['Alice Hunter', 'Bob Vance']);
                }}
                className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
