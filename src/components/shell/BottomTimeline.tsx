"use client";

import { useGameStore } from "@/store/gameStore";
import { useLearningStore } from "@/store/learningStore";
import { useCardStore } from "@/store/cardStore";
import { ClassificationIcon } from "@/components/tutor/ClassificationIcon";

/**
 * Bottom strip: moves + lessons + achievements — secondary to the board.
 */
export function BottomTimeline() {
  const annotations = useGameStore((s) => s.annotations);
  const jumpToPly = useGameStore((s) => s.jumpToPly);
  const selectedPly = useGameStore((s) => s.selectedPly);
  const timeline = useLearningStore((s) => s.timeline);
  const sessionXp = useCardStore((s) => s.sessionXp);
  const moments = useCardStore((s) => s.criticalMoments);

  return (
    <footer className="shrink-0 border-t border-ink/15 bg-paper">
      <div className="flex items-center justify-between gap-3 border-b border-ink/5 px-3 py-1.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink/40">
          Timeline · moves · lessons · achievements
        </p>
        <p className="font-mono text-[10px] text-ink/40">
          {annotations.length} plies · session +{sessionXp} XP ·{" "}
          {moments.length} critical
        </p>
      </div>
      <div className="flex gap-0 overflow-x-auto">
        {/* Moves */}
        <div className="flex min-w-0 flex-1 items-stretch gap-0 overflow-x-auto px-2 py-2">
          {annotations.length === 0 && (
            <span className="px-2 text-[11px] text-ink/35">
              Moves appear here as the game develops
            </span>
          )}
          {annotations.map((a) => {
            const themes =
              timeline.find((t) => t.ply === a.ply)?.themes ?? [];
            const active = selectedPly === a.ply;
            return (
              <button
                key={a.ply}
                type="button"
                onClick={() => jumpToPly(active ? null : a.ply)}
                className={`mr-1 flex min-w-[4.5rem] shrink-0 flex-col border px-2 py-1.5 text-left transition ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/10 hover:border-ink/30"
                }`}
              >
                <span className="font-mono text-[10px] opacity-60">
                  {Math.ceil(a.ply / 2)}.
                  {a.ply % 2 === 0 ? ".." : ""}
                </span>
                <span className="flex items-center gap-1 font-mono text-[12px]">
                  {a.san}
                  <ClassificationIcon classification={a.classification} />
                </span>
                {themes[0] && (
                  <span
                    className={`mt-0.5 truncate text-[9px] ${
                      active ? "text-paper/70" : "text-good"
                    }`}
                  >
                    ✓ {themes[0]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
