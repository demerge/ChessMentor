"use client";

import { GameBoard } from "@/components/board/GameBoard";
import { useGameStore } from "@/store/gameStore";
import { useLearningStore } from "@/store/learningStore";
import { EvalBar } from "@/components/board/EvalBar";

/**
 * Center stage — 70–80% of attention. Board dominant, chrome minimal.
 */
export function BoardStage() {
  const phase = useGameStore((s) => s.phase);
  const statusMessage = useGameStore((s) => s.statusMessage);
  const flipBoard = useGameStore((s) => s.flipBoard);
  const undo = useGameStore((s) => s.undo);
  const resign = useGameStore((s) => s.resign);
  const requestHint = useGameStore((s) => s.requestHint);
  const cycleVision = useLearningStore((s) => s.cycleVision);
  const visionMode = useLearningStore((s) => s.visionMode);
  const game = useGameStore((s) => s.game);
  const playerColor = useGameStore((s) => s.playerColor);
  const variant = useGameStore((s) => s.variant);
  const aiTier = useGameStore((s) => s.aiTier);

  return (
    <main className="board-stage relative flex min-h-0 flex-1 flex-col items-center justify-center bg-[#f3f1eb] px-3 py-4 md:px-6">
      {/* Slim board chrome */}
      <div className="mb-3 flex w-full max-w-[min(100%,640px)] items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/40">
          {variant} · {aiTier} · you {playerColor}
        </p>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["Flip", () => flipBoard()],
              [
                "Undo",
                () => void undo(),
                phase === "ai-moving" || phase === "analyzing",
              ],
              [
                visionMode === "off" ? "Vision" : `Vision:${visionMode.slice(0, 3)}`,
                () => game && cycleVision(game, playerColor),
              ],
              ["Hint", () => void requestHint(), phase !== "awaiting-move"],
              [
                "Resign",
                () => void resign(),
                phase === "game-over",
                true,
              ],
            ] as [string, () => void, boolean?, boolean?][]
          ).map(([label, fn, disabled, danger]) => (
            <button
              key={label}
              type="button"
              disabled={!!disabled}
              onClick={fn}
              className={`border px-2 py-1 text-[10px] uppercase tracking-wider disabled:opacity-30 ${
                danger
                  ? "border-signal/30 text-signal"
                  : "border-ink/15 text-ink/70 hover:border-ink/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-[min(100%,min(72vh,640px))]">
        <div className="mb-2">
          <EvalBar />
        </div>
        <GameBoard />
      </div>

      {statusMessage && (
        <p className="mt-3 max-w-md text-center font-mono text-[11px] text-ink/45">
          {statusMessage}
        </p>
      )}
    </main>
  );
}
