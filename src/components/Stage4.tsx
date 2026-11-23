'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { validateStage4Flag, getTeamGroup } from '@/lib/gameData';
import { recordStage4Completion, logActivity, TeamRecord } from '@/lib/supabase';
import {
  Flag,
  Trophy,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Lock,
  Compass,
  KeyRound,
  ShieldCheck,
  Send,
} from 'lucide-react';

interface Props {
  team: TeamRecord;
  onGoToStage3: () => void;
}

export default function Stage4({ team, onGoToStage3 }: Props) {
  const group = getTeamGroup(team.team_number);

  const [flagInput, setFlagInput] = useState(team.stage4_submission || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [solved, setSolved] = useState(team.stage4_solved || false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (team.stage4_solved) {
      setSolved(true);
      setFlagInput(team.stage4_submission || '');
    }
  }, [team.stage4_solved, team.stage4_submission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!team.stage3_solved && !solved) {
      setErrorMessage('Stage 3 must be solved before submitting Stage 4!');
      return;
    }

    if (!flagInput.trim()) {
      setErrorMessage('Please enter the flag.');
      return;
    }

    setIsSubmitting(true);
    const result = validateStage4Flag(team.team_number, flagInput);

    await logActivity(team.team_name, team.team_number, 4, 'STAGE4_FLAG_ATTEMPT', {
      input: flagInput,
      isValid: result.isValid,
    });

    if (!result.isValid) {
      setErrorMessage(
        result.errorMessage ||
          'Invalid flag sequence. Verify your parameters and test different permutations!'
      );
      setIsSubmitting(false);
      return;
    }

    // Flag captured successfully!
    setSolved(true);
    setShowSuccessModal(true);
    setIsSubmitting(false);

    // Trigger grand celebration confetti
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5 },
    });

    // Record in Supabase
    await recordStage4Completion(team.team_name, team.team_number, flagInput.trim());
  };

  // If Stage 3 is not yet solved, show locked warning
  if (!team.stage3_solved && !solved) {
    return (
      <div className="max-w-3xl mx-auto w-full px-4 py-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Stage 4 Is Currently Locked</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            You must authenticate your secret sentence in <span className="text-purple-400 font-semibold">Stage 3</span> first to obtain your team&apos;s assigned codeword.
          </p>
          <button
            type="button"
            onClick={onGoToStage3}
            className="py-3 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-lg shadow-purple-500/20 inline-flex items-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Go to Stage 3 Verification</span>
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
              <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30">
                Stage 4: Final Flag Subjugation
              </span>
              <span className="text-xs text-slate-400">Team #{team.team_number}</span>
            </div>
            <h2 className="text-2xl font-black text-white">Master Flag Verification</h2>
          </div>

          {solved ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 text-xs font-bold self-start sm:self-auto">
              <CheckCircle2 className="w-4 h-4" />
              <span>Flag Captured</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-semibold self-start sm:self-auto">
              <Flag className="w-4 h-4" />
              <span>Flag Active</span>
            </div>
          )}
        </div>

        {/* Flag Format Specification & Mandatory Disclaimer */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-950 border border-slate-800 mb-6 space-y-4 font-mono text-xs text-slate-300">
          <div>
            <div className="text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[11px]">
              Expected Flag Format Schema:
            </div>
            <div className="p-3 rounded-lg bg-black/60 border border-slate-800 text-cyan-300 font-mono text-sm break-all select-all font-bold">
              flag&#123;stage1ans-stage2anspart1-stage2anspart2-stage3ans&#125;
            </div>
          </div>

          {/* CRITICAL DISCLAIMER */}
          <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-semibold flex items-start gap-2.5 text-left">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-300 uppercase tracking-wide text-xs mb-0.5">
                Critical Permutation Disclaimer:
              </strong>
              <span>
                The order of the 4 parameters inside the flag need not be 1, 2.1, 2.2, 3! It may be in any order. You should test and try permutations until you get the correct answer.
              </span>
            </div>
          </div>

          {/* Parameter Components Guide */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-400">
            <div className="font-semibold text-slate-300">Parameter Mapping:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-cyan-400 font-bold">1:</span> Stage 1 answer
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-cyan-400 font-bold">2.1:</span> Fragment code from Stage 2
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-purple-400 font-bold">2.2:</span> Secret word from Stage 2
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-rose-400 font-bold">3:</span> Codeword received in Stage 3
              </div>
            </div>
          </div>
        </div>

        {/* Flag Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Enter Captured Flag
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="flag{part1-part2-part3-part4}"
                value={flagInput}
                onChange={(e) => setFlagInput(e.target.value)}
                disabled={solved}
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm sm:text-base font-mono font-bold leading-relaxed disabled:opacity-75"
                required
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 font-mono">
              Hyphen (-) or comma (,) delimiters are both accepted between parameters.
            </p>
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
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-extrabold tracking-wide shadow-lg shadow-rose-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating Flag with Supabase...
                </span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>SUBMIT FINAL FLAG</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowSuccessModal(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition shadow cursor-pointer"
              >
                View Victory Popup
              </button>
            </div>
          )}
        </form>

        {/* PERSISTENT VICTORY CARD */}
        {solved && (
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-rose-950/70 via-slate-900 to-slate-950 border-2 border-rose-500/80 text-center shadow-2xl shadow-rose-500/20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-500/20 border border-rose-400/50 text-rose-300 mb-4 shadow-lg shadow-rose-500/30">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>

              <div className="inline-block px-3 py-1 rounded-full bg-rose-900/80 border border-rose-400/60 text-rose-200 text-xs font-black uppercase tracking-widest mb-3">
                CHALLENGE CONQUERED!
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
                All Stages Completed!
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto mb-6">
                Outstanding work, {team.team_name}. You have successfully deduced the parameters and captured the final flag.
              </p>

              {/* Big Flag Display */}
              <div className="inline-block px-6 py-4 rounded-2xl bg-black/70 border-2 border-rose-400 text-lg sm:text-2xl font-mono font-black text-rose-300 break-all select-all shadow-2xl mb-6">
                {flagInput}
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>Final completion time and flag recorded in Supabase!</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STAGE 4 SUCCESS POP-UP MODAL BOX WITH MANDATORY NOTE */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-rose-500/80 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl shadow-rose-500/20 text-center relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/20 border border-rose-400/50 text-rose-300 mb-4 shadow-lg shadow-rose-500/30">
              <Trophy className="w-8 h-8 animate-bounce" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-rose-900/80 border border-rose-400/60 text-rose-200 text-xs font-black uppercase tracking-widest mb-3">
              FLAG CAPTURED!
            </div>

            <h3 className="text-2xl font-black text-white mb-2">
              Stage 4 &amp; Quest Completed
            </h3>

            {/* MANDATORY WARNING/NOTE POPUP BANNER */}
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left mb-5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                Please keep note of the answers in the stages for future reference!
              </span>
            </div>

            {/* Validated Flag */}
            <div className="p-4 rounded-xl bg-slate-950 border border-rose-600/60 text-rose-300 font-mono font-bold text-sm sm:text-base break-all mb-5 select-all shadow-inner">
              {flagInput}
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3.5 px-6 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-500/25 transition cursor-pointer"
            >
              Close Box
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
