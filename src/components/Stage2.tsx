'use client';

import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  generateInitialStage2Code,
  base64ToString,
  hexToString,
  rot13,
  generateDecoyJunk,
} from '@/lib/gameData';
import { logActivity, recordStage2Completion, TeamRecord } from '@/lib/supabase';
import {
  Terminal,
  RotateCcw,
  Undo2,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';

interface Props {
  team: TeamRecord;
  onProceedToStage3: () => void;
}

interface CipherButton {
  id: string;
  name: string;
}

export default function Stage2({ team, onProceedToStage3 }: Props) {
  const cipherStages = useMemo(
    () => generateInitialStage2Code(team.team_number),
    [team.team_number]
  );

  const [currentBuffer, setCurrentBuffer] = useState<string>(cipherStages.base64String);
  const [history, setHistory] = useState<string[]>([cipherStages.base64String]);
  const [copied, setCopied] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSolved, setIsSolved] = useState(team.stage2_solved || false);

  // If already solved in database
  useEffect(() => {
    if (team.stage2_solved) {
      setCurrentBuffer(cipherStages.originalString);
      setIsSolved(true);
    }
  }, [team.stage2_solved, cipherStages.originalString]);

  // Shuffled cipher buttons list (not clustered together, all uniform size)
  const buttons: CipherButton[] = useMemo(() => {
    return [
      { id: 'rot5', name: 'ROT5' },
      { id: 'hex', name: 'HEXADECIMAL' },
      { id: 'binary', name: 'BINARY' },
      { id: 'base64', name: 'BASE64' },
      { id: 'atbash', name: 'ATBASH' },
      { id: 'rot13', name: 'ROT13' },
      { id: 'octal', name: 'OCTAL' },
      { id: 'caesar7', name: 'CAESAR-7' },
    ];
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentBuffer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Undo button: restore previous buffer from history
  const handleUndo = async () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // remove current
      const previousState = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCurrentBuffer(previousState);

      await logActivity(team.team_name, team.team_number, 2, 'UNDO_CLICKED', {
        restoredLength: previousState.length,
      });
    }
  };

  // Reset button: restore initial Base64 buffer
  const handleReset = async () => {
    setCurrentBuffer(cipherStages.base64String);
    setHistory([cipherStages.base64String]);

    await logActivity(team.team_name, team.team_number, 2, 'RESET_BUFFER_CLICKED', {});
  };

  // Generic cipher button click handler
  const handleCipherButtonClick = async (btnId: string) => {
    await logActivity(team.team_name, team.team_number, 2, 'CIPHER_BUTTON_CLICKED', {
      button: btnId,
    });

    if (isSolved) {
      setShowSuccessModal(true);
      return;
    }

    let nextBuffer = '';

    // Logic:
    // Base64 is valid only if currentBuffer === cipherStages.base64String
    // Hex is valid only if currentBuffer === cipherStages.hexString
    // ROT13 is valid only if currentBuffer === cipherStages.rot13String
    // All other cases produce pure junk characters (no hints/prompts)

    if (btnId === 'base64' && currentBuffer === cipherStages.base64String) {
      nextBuffer = cipherStages.hexString;
    } else if (btnId === 'hex' && currentBuffer === cipherStages.hexString) {
      nextBuffer = cipherStages.rot13String;
    } else if (btnId === 'rot13' && currentBuffer === cipherStages.rot13String) {
      nextBuffer = cipherStages.originalString;
      setIsSolved(true);

      // Trigger Confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });

      await recordStage2Completion(team.team_name, team.team_number, cipherStages.originalString);
      setShowSuccessModal(true);
    } else {
      // Incompatible / out-of-order / decoy: generate corrupted junk output without prompting
      nextBuffer = generateDecoyJunk(btnId, currentBuffer);
    }

    setCurrentBuffer(nextBuffer);
    setHistory((prev) => [...prev, nextBuffer]);
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-6">
      {/* Stage Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 mb-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Stage 2
              </span>
              <span className="text-xs text-slate-400">Team #{team.team_number}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white">Cipher Decryption Terminal</h2>
          </div>

          {isSolved && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 text-xs font-semibold self-start sm:self-auto">
              <CheckCircle className="w-4 h-4" />
              <span>Decryption Complete</span>
            </div>
          )}
        </div>

        {/* Buffer Display */}
        <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm shadow-inner mb-4">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>PAYLOAD BUFFER</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="hover:text-cyan-400 transition flex items-center gap-1 text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div
            className={`break-all leading-relaxed p-4 rounded-lg bg-black/50 border border-slate-800/60 font-mono text-sm sm:text-base select-all min-h-[90px] flex items-center ${
              isSolved
                ? 'text-emerald-300 font-bold bg-emerald-950/20 border-emerald-800/50'
                : 'text-cyan-300'
            }`}
          >
            {currentBuffer}
          </div>

          {isSolved && (
            <div className="mt-3 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 flex items-center justify-between">
              <span className="text-xs text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Original string unlocked!
              </span>
              <button
                type="button"
                onClick={() => setShowSuccessModal(true)}
                className="text-xs px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition shadow cursor-pointer"
              >
                View Popup & Proceed
              </button>
            </div>
          )}
        </div>

        {/* PROMINENT CONTROL ACTIONS: UNDO & RESET BUFFER */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-auto">
            Buffer Controls:
          </span>

          {/* UNDO BUTTON */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs tracking-wider uppercase transition shadow disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Undo2 className="w-4 h-4" />
            <span>Undo Step</span>
          </button>

          {/* RESET BUFFER BUTTON */}
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold text-xs tracking-wider uppercase transition shadow cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Buffer</span>
          </button>
        </div>

        {/* SHUFFLED CIPHER BUTTONS (ALL SAME SIZE, UNIFORM GRID) */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
            Select Decryption Algorithm:
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {buttons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => handleCipherButtonClick(btn.id)}
                className="h-16 rounded-xl border border-slate-700 bg-slate-950/80 hover:bg-slate-800 hover:border-cyan-500 text-slate-100 hover:text-cyan-300 font-mono font-bold text-sm tracking-wider uppercase transition-all shadow-md active:scale-95 flex items-center justify-center cursor-pointer"
              >
                {btn.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SUCCESS POP-UP MODAL BOX WITH PROMINENT NOTICE */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/80 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl shadow-emerald-500/20 text-center relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-8 h-8 animate-bounce" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-emerald-950 border border-emerald-600/60 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-3">
              SUCCESSFUL!
            </div>

            <h3 className="text-2xl font-black text-white mb-2">
              Stage 2 Decrypted Successfully
            </h3>

            {/* MANDATORY WARNING/NOTE POPUP BANNER */}
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-left mb-5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                Please keep note of the answers and codes in this stage for future reference!
              </span>
            </div>

            {/* Original string */}
            <div className="p-4 rounded-xl bg-slate-900 border border-emerald-700/60 text-emerald-300 font-mono font-bold text-sm sm:text-base break-words mb-5 select-all shadow-inner">
              {cipherStages.originalString}
            </div>

            {/* Breakdown of Extracted Artifacts */}
            <div className="grid grid-cols-2 gap-3 mb-6 text-left text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Fragment Code</span>
                <span className="text-cyan-400 font-bold text-sm">
                  {team.assigned_fragment_code || cipherStages.originalString.match(/ACCESS CODE IS (\w+)/)?.[1] || '---'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Secret Word</span>
                <span className="text-purple-400 font-bold text-sm">
                  {team.assigned_secret_word || cipherStages.originalString.match(/WORD\s+IS\s+(\w+)/)?.[1] || '---'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
              >
                Close Box
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  onProceedToStage3();
                }}
                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-sm tracking-wide shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>ENTER STAGE 3</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
