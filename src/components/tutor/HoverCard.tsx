"use client";

import { useLearningStore } from "@/store/learningStore";

/** Layer 2 — piece hover educational card */
export function HoverCard() {
  const hover = useLearningStore((s) => s.hover);
  if (!hover) return null;

  return (
    <div className="pointer-events-none absolute bottom-2 left-2 z-20 max-w-xs border border-ink/20 bg-paper/95 p-3 text-xs shadow-sm backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink/50">
        {hover.square}
      </p>
      <p className="mt-1 text-sm font-medium capitalize text-ink">{hover.piece}</p>
      <p className="mt-2 font-mono text-[10px] uppercase text-ink/40">
        Current role
      </p>
      <ul className="mt-1 space-y-0.5 text-ink/80">
        {hover.roles.map((r) => (
          <li key={r}>• {r}</li>
        ))}
      </ul>
      {hover.controls.length > 0 && (
        <p className="mt-2 text-ink/50">
          Controls: {hover.controls.slice(0, 8).join(", ")}
          {hover.controls.length > 8 ? "…" : ""}
        </p>
      )}
      {hover.leavingWarnings.length > 0 && (
        <div className="mt-2 border-t border-ink/10 pt-2 text-signal">
          <p className="font-mono text-[10px] uppercase">Moving it would leave</p>
          {hover.leavingWarnings.map((w) => (
            <p key={w}>⚠ {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}
