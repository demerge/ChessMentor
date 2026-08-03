"use client";

import { useGameStore } from "@/store/gameStore";

function clampEval(cp: number): number {
  // map cp to 0–100% white share
  const bounded = Math.max(-1000, Math.min(1000, cp));
  return 50 + bounded / 20;
}

export function EvalBar() {
  const evalCp = useGameStore((s) => s.evalCp);
  const orientation = useGameStore((s) => s.orientation);

  if (evalCp === null) {
    return (
      <div className="h-2 w-full border border-ink/15 bg-neutral/20" />
    );
  }

  const whitePct = clampEval(evalCp);
  const label =
    evalCp > 50
      ? `+${(evalCp / 100).toFixed(1)}`
      : evalCp < -50
        ? (evalCp / 100).toFixed(1)
        : "0.0";

  const whiteFirst = orientation === "white";

  return (
    <div className="space-y-1">
      <div className="flex justify-between font-mono text-xs text-ink/70">
        <span>Eval</span>
        <span>{label}</span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden border border-ink/15">
        {whiteFirst ? (
          <>
            <div
              className="bg-ink transition-all duration-300"
              style={{ width: `${whitePct}%` }}
            />
            <div
              className="bg-paper transition-all duration-300"
              style={{ width: `${100 - whitePct}%` }}
            />
          </>
        ) : (
          <>
            <div
              className="bg-paper transition-all duration-300"
              style={{ width: `${100 - whitePct}%` }}
            />
            <div
              className="bg-ink transition-all duration-300"
              style={{ width: `${whitePct}%` }}
            />
          </>
        )}
      </div>
    </div>
  );
}
