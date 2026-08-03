"use client";

import {
  AdaptiveRecommendationCard,
  CandidateMoveCard,
  ConceptCard,
  ContextCard,
  DailyChallengeCard,
  LearningProgressCard,
  OpeningExplorerCard,
  PatternCollectionCard,
  WeeklyReportCard,
} from "@/components/cards/AllCards";
import { useGameStore } from "@/store/gameStore";
import { getPositionContext } from "@/engines/tutor/positionContext";

/**
 * Left rail — lesson / concept / quiz / review cards.
 * Only mounts cards that add value for the current phase.
 */
export function LearningRail() {
  const game = useGameStore((s) => s.game);
  const fen = useGameStore((s) => s.fen);
  const phase = useGameStore((s) => s.phase);
  void fen;

  const ctx = game ? getPositionContext(game) : null;
  const showOpening = ctx?.phase === "opening" || ctx?.inTheory;
  const showCandidates = phase === "awaiting-move";
  const showWeekly = phase === "game-over" || phase === "idle";

  return (
    <aside className="learning-rail flex h-full flex-col gap-0 overflow-y-auto border-r border-ink/10 bg-paper">
      <div className="sticky top-0 z-10 border-b border-ink/10 bg-paper px-3 py-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink/40">
          Learning rail
        </p>
      </div>
      <div className="flex flex-col gap-2 p-2">
        <ContextCard />
        {showOpening && <OpeningExplorerCard />}
        <ConceptCard />
        {showCandidates && <CandidateMoveCard />}
        <DailyChallengeCard />
        <LearningProgressCard />
        <PatternCollectionCard />
        <AdaptiveRecommendationCard />
        {showWeekly && <WeeklyReportCard />}
      </div>
    </aside>
  );
}
