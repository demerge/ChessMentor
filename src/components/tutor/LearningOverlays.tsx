"use client";

import { useGameStore } from "@/store/gameStore";
import { useLearningStore } from "@/store/learningStore";

/** Layer 1 checklist, 3 prediction quiz, 4 interrupt, 6 animation */
export function LearningOverlays() {
  const checklist = useLearningStore((s) => s.checklist);
  const checklistOpen = useLearningStore((s) => s.checklistOpen);
  const toggleChecklistItem = useLearningStore((s) => s.toggleChecklistItem);
  const dismissChecklist = useLearningStore((s) => s.dismissChecklist);
  const interrupt = useLearningStore((s) => s.interrupt);
  const animation = useLearningStore((s) => s.animation);
  const dismissAnimation = useLearningStore((s) => s.dismissAnimation);
  const resolveLearningInterrupt = useGameStore((s) => s.resolveLearningInterrupt);
  const phase = useGameStore((s) => s.phase);

  return (
    <>
      {/* 1 — Guided thinking checklist */}
      {checklistOpen && checklist && !checklist.dismissed && phase === "awaiting-move" && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/20 bg-paper/95 p-4 shadow-lg backdrop-blur sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-sm sm:border">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">
            Before the move · guided thinking
          </p>
          {checklist.kingExposed && (
            <p className="mt-2 text-sm text-signal">
              Your king is slightly exposed.
            </p>
          )}
          <p className="mt-2 text-sm text-ink/80">Before moving, ask yourself:</p>
          <ul className="mt-3 space-y-2">
            {checklist.items.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="mt-1 accent-ink"
                  />
                  <span>
                    <span className="text-ink">{item.label}</span>
                    {item.checked && item.hint && (
                      <span className="mt-0.5 block text-xs text-ink/50">
                        {item.hint}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={dismissChecklist}
            className="mt-4 w-full border border-ink bg-ink px-3 py-2 text-xs uppercase tracking-wider text-paper"
          >
            I&apos;ve thought — continue
          </button>
        </div>
      )}

      {/* Prediction is a Coach Rail card (not a blocking modal) — wait still pauses AI */}

      {/* 4 — Intelligent mistake interruption */}
      {interrupt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md border border-ink bg-paper p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal">
              {interrupt.level === "forced_mate"
                ? "Forced mate"
                : interrupt.level === "major"
                  ? "Major moment"
                  : "Minor mistake"}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-ink">
              {interrupt.title}
            </h2>
            <p className="mt-2 text-sm text-ink/80">{interrupt.emotional}</p>
            <p className="mt-2 text-sm text-ink/60">{interrupt.message}</p>
            {interrupt.bestMoveSan && (
              <p className="mt-2 font-mono text-xs text-ink/50">
                Stronger idea exists
                {interrupt.level === "forced_mate" ? "" : ` (e.g. ${interrupt.bestMoveSan})`}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void resolveLearningInterrupt("continue")}
                className="border border-ink bg-ink px-3 py-2 text-xs uppercase tracking-wider text-paper"
              >
                {interrupt.level === "forced_mate" ? "Continue anyway" : "Yes, continue"}
              </button>
              <button
                type="button"
                onClick={() => void resolveLearningInterrupt("show")}
                className="border border-ink/30 px-3 py-2 text-xs uppercase tracking-wider"
              >
                {interrupt.level === "forced_mate" ? "Show line" : "Show me why"}
              </button>
              <button
                type="button"
                onClick={() => void resolveLearningInterrupt("undo")}
                className="border border-ink/30 px-3 py-2 text-xs uppercase tracking-wider"
              >
                Undo
              </button>
              {interrupt.level === "forced_mate" && (
                <button
                  type="button"
                  onClick={() => void resolveLearningInterrupt("hint")}
                  className="border border-good/40 px-3 py-2 text-xs uppercase tracking-wider text-good"
                >
                  Hint
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6 — Animated tactical theme */}
      {animation?.active && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/30 p-4">
          <div className="w-full max-w-sm border border-ink bg-paper p-5 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-good">
              {animation.label}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink">
              {animation.description}
            </p>
            <p className="mt-2 font-mono text-xs text-ink/40">
              Arrows on the board highlight the idea
            </p>
            <button
              type="button"
              onClick={dismissAnimation}
              className="mt-4 border border-ink bg-ink px-4 py-2 text-xs uppercase tracking-wider text-paper"
            >
              Got it — resume
            </button>
          </div>
        </div>
      )}
    </>
  );
}
