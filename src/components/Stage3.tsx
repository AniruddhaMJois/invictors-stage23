'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { validateStage3Sentence, getTeamGroup } from '@/lib/gameData';
import { recordStage3Completion, logActivity, TeamRecord } from '@/lib/supabase';
import {
  ShieldAlert,
  Send,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  Compass,
  FileCheck2,
  HelpCircle,
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
  const [assignedCodeword, setAssignedCodeword] = useState<string>(
    team.assigned_final_codeword || group.finalCodeword
  );

  // Real-time requirement detection for smooth user experience
  const validationPreview = validateStage3Sentence(team.team_number, sentenceInput);

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
      missingRole: !result.hasRoleIntro,
      missingFragment: !result.hasFragmentCode,
      missingSecretWord: !result.hasSecretWord,
    });

    if (!result.isValid) {
      setErrorMessage(
        result.errorMessage ||
          'Validation failed. Ensure your sentence includes "I am [role]", your assigned Fragment Code, and Secret Word.'
      );
      setIsSubmitting(false);
      return;
    }

    // Solved!
    setSolved(true);
    setAssignedCodeword(result.assignedCodeword);
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
                Stage 3: Secret Sentence Authentication
              </span>
              <span className="text-xs text-slate-400">Team #{team.team_number}</span>
            </div>
            <h2 className="text-2xl font-black text-white">Transmission Verification</h2>
          </div>

          {solved ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verified &amp; Solved</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-semibold">
              <FileCheck2 className="w-4 h-4" />
              <span>Awaiting Authentication</span>
            </div>
          )}
        </div>

        {/* Requirements Box */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 mb-6 text-xs text-slate-300 space-y-2">
          <div className="font-semibold text-slate-200 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Sentence Verification Instructions:</span>
          </div>
          <p className="text-slate-400 text-xs">
            Formulate a secret sentence containing an <span className="text-cyan-300 font-mono font-semibold">&quot;I am [role]&quot;</span> declaration, combined with your decrypted <span className="text-cyan-300 font-mono font-semibold">Fragment Code</span> and <span className="text-purple-300 font-mono font-semibold">Secret Word</span> obtained from Stage 2.
          </p>
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-4 text-[11px] text-slate-400">
            <span>
              Expected Fragment Code: <strong className="text-cyan-400 font-mono">{group.fragmentCode}</strong>
            </span>
            <span>
              Expected Secret Word: <strong className="text-purple-400 font-mono">{group.secretWord}</strong>
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Enter Secret Sentence
            </label>
            <div className="relative">
              <textarea
                rows={3}
                placeholder={`e.g. I am the lead cryptanalyst operating with fragment ${group.fragmentCode} and passkey ${group.secretWord}`}
                value={sentenceInput}
                onChange={(e) => setSentenceInput(e.target.value)}
                disabled={solved}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono leading-relaxed disabled:opacity-75"
                required
              />
            </div>
          </div>

          {/* Live Validation Checklist (helps teams see what is recognized) */}
          {!solved && sentenceInput.trim().length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
              <div className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">
                Live Syntactic Analysis:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    validationPreview.hasRoleIntro
                      ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      validationPreview.hasRoleIntro ? 'text-emerald-400' : 'text-slate-600'
                    }`}
                  />
                  <span>
                    &quot;I am [role]&quot;{' '}
                    {validationPreview.extractedRole ? `(${validationPreview.extractedRole})` : ''}
                  </span>
                </div>

                <div
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    validationPreview.hasFragmentCode
                      ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      validationPreview.hasFragmentCode ? 'text-emerald-400' : 'text-slate-600'
                    }`}
                  />
                  <span>Fragment: {group.fragmentCode}</span>
                </div>

                <div
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    validationPreview.hasSecretWord
                      ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      validationPreview.hasSecretWord ? 'text-emerald-400' : 'text-slate-600'
                    }`}
                  />
                  <span>Word: {group.secretWord}</span>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 flex items-start gap-3 text-xs sm:text-sm text-rose-300">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!solved && (
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
          )}
        </form>

        {/* VICTORY CARD: REVEALS ASSIGNED WORD (ALPHA, SIGMA, THETA, DELTA) */}
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
    </div>
  );
}
