'use client';

import React, { useState, useEffect } from 'react';
import { formatStopwatchTime } from '@/lib/supabase';
import { Timer, CheckCircle2, Flag } from 'lucide-react';

interface Props {
  questStartedAt?: string | null;
  isCompleted?: boolean;
  totalDurationSeconds?: number | null;
}

export default function TimerHUD({
  questStartedAt,
  isCompleted = false,
  totalDurationSeconds,
}: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    if (isCompleted && totalDurationSeconds) {
      return totalDurationSeconds;
    }
    if (questStartedAt) {
      return Math.max(0, Math.floor((Date.now() - new Date(questStartedAt).getTime()) / 1000));
    }
    return 0;
  });

  useEffect(() => {
    // If completed, freeze at total duration
    if (isCompleted && totalDurationSeconds) {
      setElapsedSeconds(totalDurationSeconds);
      return;
    }

    if (!questStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    // Live ticking every second
    const updateElapsed = () => {
      const now = Date.now();
      const start = new Date(questStartedAt).getTime();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      setElapsedSeconds(diff);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [questStartedAt, isCompleted, totalDurationSeconds]);

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border font-mono text-xs shadow-md transition-all ${
        isCompleted
          ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-300 ring-2 ring-emerald-500/20'
          : questStartedAt
          ? 'bg-slate-950/80 border-cyan-500/60 text-cyan-300 ring-1 ring-cyan-500/30'
          : 'bg-slate-950/60 border-slate-800 text-slate-500'
      }`}
      title={
        isCompleted
          ? 'Quest Completed: Final Elapsed Time'
          : questStartedAt
          ? 'Quest Active: Live Elapsed Time'
          : 'Timer starts upon entering Stage 2'
      }
    >
      {isCompleted ? (
        <Flag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      ) : (
        <Timer
          className={`w-3.5 h-3.5 shrink-0 ${
            questStartedAt ? 'text-cyan-400 animate-pulse' : 'text-slate-500'
          }`}
        />
      )}

      <div className="flex items-center gap-1.5 font-bold tracking-wider">
        <span className="text-[10px] uppercase opacity-75 hidden sm:inline">
          {isCompleted ? 'Final Time:' : 'Time:'}
        </span>
        <span className="text-sm font-black text-white">
          {formatStopwatchTime(elapsedSeconds)}
        </span>
      </div>

      {questStartedAt && !isCompleted && (
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
      )}
      {isCompleted && (
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
      )}
    </div>
  );
}
