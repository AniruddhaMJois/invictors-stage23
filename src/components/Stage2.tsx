'use client';

import React, { useState, useEffect } from 'react';
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
  KeyRound,
  RotateCcw,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface Props {
  team: TeamRecord;
  onProceedToStage3: () => void;
}

type Stage2Step = 'base64' | 'hex' | 'rot13' | 'solved' | 'glitched';

export default function Stage2({ team, onProceedToStage3 }: Props) {
  // Pre-generate cipher stages for this team
  const cipherStages = React.useMemo(
    () => generateInitialStage2Code(team.team_number),
    [team.team_number]
  );

  const [currentBuffer, setCurrentBuffer] = useState<string>(cipherStages.base64String);
  const [currentStep, setCurrentStep] = useState<Stage2Step>('base64');
  const [glitchMessage, setGlitchMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [actionHistory, setActionHistory] = useState<string[]>([]);

  // If already solved in database
  useEffect(() => {
    if (team.stage2_solved) {
      setCurrentBuffer(cipherStages.originalString);
      setCurrentStep('solved');
    }
  }, [team.stage2_solved, cipherStages.originalString]);

  const addHistory = (msg: string) => {
    setActionHistory((prev) => [msg, ...prev.slice(0, 9)]);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentBuffer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Base64 button clicked
  const handleBase64Click = async () => {
    await logActivity(team.team_name, team.team_number, 2, 'DECODE_BUTTON_CLICKED', {
      button: 'Base64',
      currentStep,
    });

    if (currentStep === 'base64') {
      const decodedHex = base64ToString(currentBuffer);
      setCurrentBuffer(decodedHex);
      setCurrentStep('hex');
      setGlitchMessage(null);
      addHistory('✓ Base64 decoded successfully -> Unlocked Hexadecimal layer.');
    } else if (currentStep === 'solved') {
      setGlitchMessage('Payload already fully decrypted!');
    } else {
      // Hierarchy mismatch
      const junk = generateDecoyJunk('corrupt', currentBuffer);
      setCurrentBuffer(junk);
      setCurrentStep('glitched');
      setGlitchMessage('Hierarchy Mismatch: Buffer is not in Base64 encoding. Corrupted stream!');
      addHistory('✕ Base64 decode failed: invalid state.');
    }
  };

  // Hex button clicked
  const handleHexClick = async () => {
    await logActivity(team.team_name, team.team_number, 2, 'DECODE_BUTTON_CLICKED', {
      button: 'Hex',
      currentStep,
    });

    if (currentStep === 'hex') {
      const decodedRot13 = hexToString(currentBuffer);
      setCurrentBuffer(decodedRot13);
      setCurrentStep('rot13');
      setGlitchMessage(null);
      addHistory('✓ Hexadecimal decoded successfully -> Unlocked ROT13 layer.');
    } else if (currentStep === 'base64') {
      const junk = generateDecoyJunk('corrupt', currentBuffer);
      setCurrentBuffer(junk);
      setCurrentStep('glitched');
      setGlitchMessage('Sequence Error: Hierarchy requires Base64 first before Hexadecimal can be read!');
      addHistory('✕ Hex decode failed: Base64 layer still present.');
    } else if (currentStep === 'solved') {
      setGlitchMessage('Payload already fully decrypted!');
    } else {
      const junk = generateDecoyJunk('corrupt', currentBuffer);
      setCurrentBuffer(junk);
      setCurrentStep('glitched');
      setGlitchMessage('Hexadecimal parsing failed on current byte structure.');
      addHistory('✕ Hex decode failed.');
    }
  };

  // ROT13 button clicked
  const handleRot13Click = async () => {
    await logActivity(team.team_name, team.team_number, 2, 'DECODE_BUTTON_CLICKED', {
      button: 'ROT13',
      currentStep,
    });

    if (currentStep === 'rot13') {
      // Final decrypt!
      const original = rot13(currentBuffer);
      setCurrentBuffer(original);
      setCurrentStep('solved');
      setGlitchMessage(null);
      addHistory('★ ROT13 decrypted! Original Access String revealed!');

      // Trigger Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Sync completion to Supabase
      await recordStage2Completion(team.team_name, team.team_number, original);
      setShowSuccessModal(true);
    } else if (currentStep === 'base64' || currentStep === 'hex') {
      const junk = generateDecoyJunk('corrupt', currentBuffer);
      setCurrentBuffer(junk);
      setCurrentStep('glitched');
      setGlitchMessage(
        `Hierarchy Error: You cannot apply ROT13 yet! Follow the sequence: Base64 → Hex → ROT13.`
      );
      addHistory('✕ ROT13 failed: hierarchy out of order.');
    } else if (currentStep === 'solved') {
      setShowSuccessModal(true);
    } else {
      const junk = generateDecoyJunk('corrupt', currentBuffer);
      setCurrentBuffer(junk);
      setCurrentStep('glitched');
      setGlitchMessage('Corrupted buffer: cannot apply ROT13 to noise.');
    }
  };

  // Decoy buttons (ROT5, Octal, Binary, Atbash, Caesar-7)
  const handleDecoyClick = async (type: string) => {
    await logActivity(team.team_name, team.team_number, 2, 'DECOY_BUTTON_CLICKED', {
      decoyType: type,
      currentStep,
    });

    const junk = generateDecoyJunk(type, currentBuffer);
    setCurrentBuffer(junk);
    setCurrentStep('glitched');
    setGlitchMessage(
      `JUNK OUTPUT GENERATED: The [${type.toUpperCase()}] algorithm is incompatible with this cipher format! Corrupting transmission...`
    );
    addHistory(`✕ Incompatible cipher: [${type.toUpperCase()}] produced noise.`);
  };

  // Reset back to initial Base64 code
  const handleReset = async () => {
    await logActivity(team.team_name, team.team_number, 2, 'RESET_BUFFER_CLICKED', {});
    setCurrentBuffer(cipherStages.base64String);
    setCurrentStep('base64');
    setGlitchMessage(null);
    addHistory('↺ Decryption terminal reset to initial Base64 payload.');
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-6">
      {/* Stage Header & Sequence Info */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 mb-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Stage 2: Cryptographic Sequence
              </span>
              <span className="text-xs text-slate-400">Team #{team.team_number}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white">Multi-Layer Cipher Decryption</h2>
          </div>

          {currentStep === 'solved' ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 text-xs font-semibold">
              <CheckCircle className="w-4 h-4" />
              <span>Decryption Complete</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-semibold">
              <KeyRound className="w-4 h-4" />
              <span>Cipher Active</span>
            </div>
          )}
        </div>

        {/* Hierarchy Progress Breadcrumb */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Layers className="w-4 h-4" />
              Decryption Hierarchy:
            </span>
            <span className="text-slate-400 text-[11px]">
              Order: Base64 → Hexadecimal → ROT13
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Step 1: Base64 */}
            <div
              className={`p-2.5 rounded-lg border text-center transition-all ${
                currentStep === 'base64'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-2 ring-cyan-500/20 font-bold'
                  : currentStep === 'hex' || currentStep === 'rot13' || currentStep === 'solved'
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-75">Step 1</div>
              <div className="text-sm font-mono flex items-center justify-center gap-1">
                Base64
                {(currentStep === 'hex' || currentStep === 'rot13' || currentStep === 'solved') && (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
            </div>

            {/* Step 2: Hex */}
            <div
              className={`p-2.5 rounded-lg border text-center transition-all ${
                currentStep === 'hex'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-2 ring-cyan-500/20 font-bold'
                  : currentStep === 'rot13' || currentStep === 'solved'
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-75">Step 2</div>
              <div className="text-sm font-mono flex items-center justify-center gap-1">
                Hexadecimal
                {(currentStep === 'rot13' || currentStep === 'solved') && (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
            </div>

            {/* Step 3: ROT13 */}
            <div
              className={`p-2.5 rounded-lg border text-center transition-all ${
                currentStep === 'rot13'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-2 ring-cyan-500/20 font-bold'
                  : currentStep === 'solved'
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-75">Step 3</div>
              <div className="text-sm font-mono flex items-center justify-center gap-1">
                ROT13
                {currentStep === 'solved' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
            </div>
          </div>
        </div>

        {/* Glitch / Warning Alert */}
        {glitchMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-950/50 border border-amber-800/80 flex items-start gap-3 text-xs sm:text-sm text-amber-200 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">{glitchMessage}</span>
              <span className="text-[11px] text-amber-400/80">
                Click &quot;Reset Buffer&quot; below to restore your clean ciphertext transmission.
              </span>
            </div>
          </div>
        )}

        {/* Cipher Transmission Buffer Screen */}
        <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-sm shadow-inner mb-6">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>TERMINAL BUFFER // {currentStep.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="hover:text-cyan-400 transition flex items-center gap-1 text-[11px]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="hover:text-rose-400 transition flex items-center gap-1 text-[11px]"
                title="Reset back to Base64 payload"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Buffer</span>
              </button>
            </div>
          </div>

          <div
            className={`break-all leading-relaxed p-3 rounded-lg bg-black/40 border border-slate-800/60 font-mono text-sm sm:text-base select-all ${
              currentStep === 'solved'
                ? 'text-emerald-300 font-bold bg-emerald-950/20 border-emerald-800/50'
                : currentStep === 'glitched'
                ? 'text-rose-400 font-mono tracking-widest'
                : 'text-cyan-300'
            }`}
          >
            {currentBuffer}
          </div>

          {currentStep === 'solved' && (
            <div className="mt-3 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 flex items-center justify-between">
              <span className="text-xs text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Original string unlocked successfully!
              </span>
              <button
                type="button"
                onClick={() => setShowSuccessModal(true)}
                className="text-xs px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition shadow"
              >
                View Popup & Proceed
              </button>
            </div>
          )}
        </div>

        {/* Decoder Controls: Primary Hierarchy Buttons */}
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <span>Decryption Pipeline (Follow Correct Hierarchy)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleBase64Click}
              className={`p-3.5 rounded-xl border text-center font-bold tracking-wide transition shadow-lg flex flex-col items-center justify-center gap-1 cursor-pointer ${
                currentStep === 'base64'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-400 text-white shadow-cyan-500/25 ring-2 ring-cyan-400 scale-[1.02]'
                  : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-300'
              }`}
            >
              <span className="text-base">1. BASE64</span>
              <span className="text-[10px] font-normal opacity-80">Decodes Base64 → Hex</span>
            </button>

            <button
              type="button"
              onClick={handleHexClick}
              className={`p-3.5 rounded-xl border text-center font-bold tracking-wide transition shadow-lg flex flex-col items-center justify-center gap-1 cursor-pointer ${
                currentStep === 'hex'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-400 text-white shadow-cyan-500/25 ring-2 ring-cyan-400 scale-[1.02]'
                  : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-300'
              }`}
            >
              <span className="text-base">2. HEXADECIMAL</span>
              <span className="text-[10px] font-normal opacity-80">Decodes Hex → ROT13</span>
            </button>

            <button
              type="button"
              onClick={handleRot13Click}
              className={`p-3.5 rounded-xl border text-center font-bold tracking-wide transition shadow-lg flex flex-col items-center justify-center gap-1 cursor-pointer ${
                currentStep === 'rot13'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-400 text-white shadow-emerald-500/25 ring-2 ring-emerald-400 scale-[1.02]'
                  : 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-300'
              }`}
            >
              <span className="text-base">3. ROT13</span>
              <span className="text-[10px] font-normal opacity-80">Decodes ROT13 → Original</span>
            </button>
          </div>
        </div>

        {/* Decoy / Junk Buttons */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
              Auxiliary / Decoy Algorithms
            </span>
            <span className="text-[11px] text-slate-500 lowercase">
              (caution: incompatible algorithms yield corrupted noise)
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'rot5', label: 'ROT5 (Digits)' },
              { id: 'octal', label: 'Octal (Base-8)' },
              { id: 'binary', label: 'Binary Stream' },
              { id: 'atbash', label: 'Atbash Cipher' },
              { id: 'caesar7', label: 'Caesar Shift 7' },
            ].map((decoy) => (
              <button
                key={decoy.id}
                type="button"
                onClick={() => handleDecoyClick(decoy.id)}
                className="px-3 py-2 rounded-lg bg-slate-950/70 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-800/60 text-slate-400 hover:text-rose-300 text-xs font-mono transition cursor-pointer"
              >
                [{decoy.label}]
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Terminal Action Log */}
      {actionHistory.length > 0 && (
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 text-xs font-mono text-slate-400">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">
            Local Activity Stream (Synced to Supabase in real-time)
          </div>
          <div className="space-y-1">
            {actionHistory.map((item, i) => (
              <div key={i} className="text-slate-300">
                &gt; {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUCCESS POP-UP MODAL BOX */}
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
              Stage 2 Decryption Complete
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm mb-6">
              You have stripped through Base64, Hexadecimal, and ROT13 layers. Below is your official decrypted string:
            </p>

            {/* Display the original string */}
            <div className="p-4 rounded-xl bg-slate-900 border border-emerald-700/60 text-emerald-300 font-mono font-bold text-sm sm:text-base break-words mb-6 select-all shadow-inner">
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
