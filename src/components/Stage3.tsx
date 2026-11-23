'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { validateStage3Sentence, getTeamGroup } from '@/lib/gameData';
import { recordStage3Completion, logActivity, TeamRecord } from '@/lib/supabase';
import {
  Send,
  Trophy,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Lock,
  Compass,
  FileCheck2,
} from 'lucide-react';

interface Props {
  team: TeamRecord;
  onGoToStage2: () => void;
}

export default function Stage3({ team, onGoToStage2 }: Props) {
  const group = getTeamGroup(team.team_number);

  const [sentenceInput, setSentenceInput] = useState(team.stage3_submission || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [solved, setSolved] = useState(team.stage3_solved || false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [assignedCodeword, setAssignedCodeword] = useState<string>(
    team.assigned_final_codeword || group.finalCodeword
  );

  useEffect(() => {
    if (team.stage3_solved) {
      setSolved(true);
      setSentenceInput(team.stage3_submission || '');
      setAssignedCodeword(team.assigned_final_codeword || group.finalCodeword);
    }
  }, [team.stage3_solved, team.stage3_submission, team.assigned_final_codeword, group.finalCodeword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!team.stage2_solved && !solved) {
      setErrorMessage('Stage 2 must be solved before submitting Stage 3!');
      return;
    }

    if (!sentenceInput.trim()) {
      setErrorMessage('Please enter the secret sentence.');
      return;
    }

    setIsSubmitting(true);
    const result = validateStage3Sentence(team.team_number, sentenceInput);

    await logActivity(team.team_name, team.team_number, 3, 'STAGE3_ATTEMPT', {
      input: sentenceInput,
      isValid: result.isValid,
    });

    if (!result.isValid) {
      setErrorMessage(
        result.errorMessage ||
          'Sentence verification failed. Ensure your sentence includes an "I am [role]" declaration along with your assigned fragment code and secret word.'
      );
      setIsSubmitting(false);
      return;
    }

    // Solved!
    setSolved(true);
    setAssignedCodeword(result.assignedCodeword);
    setShowSuccessModal(true);
    setIsSubmitting(false);

    // Trigger celebration confetti
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
    });

    // Sync to Supabase
    await recordStage3Completion(
      team.team_name,
      team.team_number,
      sentenceInput.trim(),
      result.assignedCodeword
    );
  };

  // If Stage 2 is not yet solved, show locked warning
  if (!team.stage2_solved && !solved) {
    return (
      <div className="max-w-3xl mx-auto w-full px-4 py-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Stage 3 Is Currently Locked</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            You must decrypt your team&apos;s cryptographic payload in <span className="text-cyan-400 font-semibold">Stage 2</span> first to discover your secret fragment code and secret word.
          </p>
          <button
            type="button"
            onClick={onGoToStage2}
            className="py-3 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Go to Stage 2 Decryption</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/30">
                Stage 3
              </span>
              <span className="text-xs text-slate-400">Team #{team.team_number}</span>
            </div>
            <h2 className="text-2xl font-black text-white">Secret Sentence Authentication</h2>
          </div>

          {solved ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 text-xs font-bold self-start sm:self-auto">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verified &amp; Solved</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-semibold self-start sm:self-auto">
              <FileCheck2 className="w-4 h-4" />
              <span>Awaiting Authentication</span>
            </div>
          )}
        </div>

        {/* Clean Form without spoiler instructions or live checklist */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Enter Secret Sentence
            </label>
            <div className="relative">
              <textarea
                rows={4}
                placeholder="Enter the secret sentence (minimum 15 words)..."
                value={sentenceInput}
                onChange={(e) => setSentenceInput(e.target.value)}
                disabled={solved}
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono leading-relaxed disabled:opacity-75"
                required
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-xs">
              <span className="text-slate-400">
                Constraint: Minimum 15 words
              </span>
              <span
                className={`font-mono font-semibold ${
                  sentenceInput.trim().split(/\s+/).filter(Boolean).length >= 15
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {sentenceInput.trim().split(/\s+/).filter(Boolean).length} / 15 words
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 flex items-start gap-3 text-xs sm:text-sm text-rose-300">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!solved ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold tracking-wide shadow-lg shadow-purple-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying with Supabase...
                </span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Verify Secret Sentence</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowSuccessModal(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition shadow cursor-pointer"
              >
                View Codeword Popup
              </button>
            </div>
          )}
        </form>

        {/* VICTORY CARD DISPLAY (PERSISTENT SUMMARY) */}
        {solved && (
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-purple-950/70 via-slate-900 to-slate-950 border-2 border-purple-500/80 text-center shadow-2xl shadow-purple-500/20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-300 mb-4 shadow-lg shadow-purple-500/30">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>

              <div className="inline-block px-3 py-1 rounded-full bg-purple-900/80 border border-purple-400/60 text-purple-200 text-xs font-black uppercase tracking-widest mb-3">
                AUTHENTICATION GRANTED
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
                Congratulations, {team.team_name}!
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto mb-6">
                Your secret sentence has been validated and recorded. Here is your team&apos;s official assigned codeword:
              </p>

              {/* Big Codeword Display */}
              <div className="inline-block px-10 py-5 rounded-2xl bg-black/60 border-2 border-purple-400 text-4xl sm:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 shadow-2xl mb-6">
                {assignedCodeword}
              </div>

              {/* Team details digest */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left text-xs font-mono max-w-lg mx-auto">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Team</span>
                  <span className="text-white font-semibold">#{team.team_number}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Fragment</span>
                  <span className="text-cyan-400 font-semibold">{group.fragmentCode}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Secret Word</span>
                  <span className="text-pink-400 font-semibold">{group.secretWord}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">Codeword</span>
                  <span className="text-purple-300 font-bold">{assignedCodeword}</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-emerald-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>All actions and completion recorded in Supabase!</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STAGE 3 SUCCESS POP-UP MODAL BOX WITH PROMINENT NOTICE */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-purple-500/80 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl shadow-purple-500/20 text-center relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-300 mb-4 shadow-lg shadow-purple-500/30">
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-purple-900/80 border border-purple-400/60 text-purple-200 text-xs font-black uppercase tracking-widest mb-3">
              STAGE 3 COMPLETED!
            </div>

            <h3 className="text-2xl font-black text-white mb-2">
              Authentication Granted
            </h3>

            {/* MANDATORY WARNING/NOTE POPUP BANNER */}
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left mb-5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                Please keep note of the answers in the stages for future reference!
              </span>
            </div>

            {/* Big Assigned Codeword */}
            <div className="p-5 rounded-2xl bg-black/60 border-2 border-purple-400 text-4xl sm:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 shadow-xl mb-5">
              {assignedCodeword}
            </div>

            {/* Breakdown of Team Artifacts */}
            <div className="grid grid-cols-2 gap-3 mb-6 text-left text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Fragment Code</span>
                <span className="text-cyan-400 font-bold text-sm">{group.fragmentCode}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Secret Word</span>
                <span className="text-purple-400 font-bold text-sm">{group.secretWord}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-500/25 transition cursor-pointer"
            >
              Close Box
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
