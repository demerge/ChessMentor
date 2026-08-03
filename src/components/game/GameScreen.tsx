"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AiTier, PlayColor, TutorDetail, Variant } from "@/lib/types";
import { TIER_META, VARIANT_LABELS } from "@/lib/types";
import { useGameStore } from "@/store/gameStore";
import { useLearningStore } from "@/store/learningStore";
import { useCardStore } from "@/store/cardStore";
import { AppNav } from "@/components/shell/AppNav";
import { LearningRail } from "@/components/shell/LearningRail";
import { CoachRail } from "@/components/shell/CoachRail";
import { BoardStage } from "@/components/shell/BoardStage";
import { BottomTimeline } from "@/components/shell/BottomTimeline";
import { LearningOverlays } from "@/components/tutor/LearningOverlays";

/**
 * Board-first shell (70–80% attention on center).
 * Cards in rails appear only when they add learning value.
 */
export function GameScreen({
  variant,
  tier,
  detail,
  color,
}: {
  variant: Variant;
  tier: AiTier;
  detail: TutorDetail;
  color: PlayColor;
}) {
  const router = useRouter();
  const startGame = useGameStore((s) => s.startGame);
  const phase = useGameStore((s) => s.phase);
  const savedRecord = useGameStore((s) => s.savedRecord);
  const result = useGameStore((s) => s.result);
  const endReason = useGameStore((s) => s.endReason);
  const error = useGameStore((s) => s.error);
  const playerColor = useGameStore((s) => s.playerColor);
  const lessonSummary = useLearningStore((s) => s.lessonSummary);
  const resetSessionCards = useCardStore((s) => s.resetSessionCards);

  useEffect(() => {
    resetSessionCards();
    void startGame({
      variant,
      aiTier: tier,
      tutorDetail: detail,
      playAs: color,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, tier, detail, color]);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-paper text-ink">
      <LearningOverlays />
      <AppNav
        subtitle={`${VARIANT_LABELS[variant]} · ${TIER_META[tier].label} · you are ${playerColor}`}
      />

      {error && (
        <div className="shrink-0 border-b border-signal/30 bg-signal/5 px-4 py-1.5 text-[12px] text-signal">
          {error}
        </div>
      )}

      {phase === "game-over" && (
        <div className="shrink-0 border-b border-ink/10 bg-ink/[0.03] px-4 py-3">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-start justify-between gap-3">
            <div className="text-[13px]">
              <strong>Game over</strong>
              {endReason ? ` — ${endReason}` : ""} ({result})
              {lessonSummary && (
                <span className="mt-1 block text-[12px] text-ink/60">
                  {lessonSummary.achievements[0]} · Next:{" "}
                  {lessonSummary.recommendedLesson}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {savedRecord && (
                <button
                  type="button"
                  onClick={() => router.push(`/report/${savedRecord.id}`)}
                  className="border border-ink bg-ink px-3 py-1.5 text-[10px] uppercase tracking-wider text-paper"
                >
                  Report
                </button>
              )}
              <Link
                href="/"
                className="border border-ink/20 px-3 py-1.5 text-[10px] uppercase tracking-wider"
              >
                New game
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main 3-column workspace */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(220px,18%)_minmax(0,1fr)_minmax(240px,20%)]">
        <div className="hidden min-h-0 lg:block">
          <LearningRail />
        </div>
        <BoardStage />
        <div className="hidden min-h-0 lg:block">
          <CoachRail />
        </div>
      </div>

      {/* Mobile card drawers */}
      <div className="flex shrink-0 gap-0 overflow-x-auto border-t border-ink/10 lg:hidden">
        <details className="min-w-[85vw] border-r border-ink/10">
          <summary className="cursor-pointer px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-ink/50">
            Learning cards
          </summary>
          <div className="max-h-[40vh] overflow-y-auto">
            <LearningRail />
          </div>
        </details>
        <details className="min-w-[85vw]">
          <summary className="cursor-pointer px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-ink/50">
            Coach cards
          </summary>
          <div className="max-h-[40vh] overflow-y-auto">
            <CoachRail />
          </div>
        </details>
      </div>

      <BottomTimeline />
    </div>
  );
}
