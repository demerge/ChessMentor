"use client";

import {
  AchievementCard,
  AnimatedDemoCard,
  CoachConversationCard,
  EndgameCoachCard,
  HintLadderCard,
  MistakeAnalysisCard,
  MoveEvaluationCard,
  PredictionCard,
  ReflectionCard,
  ReplayCard,
  TacticalDetectionCard,
  WhyThisMoveCard,
} from "@/components/cards/AllCards";
import { useGameStore } from "@/store/gameStore";
import { useLearningStore } from "@/store/learningStore";
import { getPositionContext } from "@/engines/tutor/positionContext";

/**
 * Right rail — coach, tactics, eval, hints.
 * Contextual: endgame/mistake/prediction only when relevant.
 */
export function CoachRail() {
  const game = useGameStore((s) => s.game);
  const fen = useGameStore((s) => s.fen);
  const last = useGameStore((s) => s.lastOutcome);
  const phase = useGameStore((s) => s.phase);
  const quiz = useLearningStore((s) => s.predictionQuiz);
  const animation = useLearningStore((s) => s.animation);
  void fen;

  const ctx = game ? getPositionContext(game) : null;
  const showEndgame = ctx?.phase === "endgame";
  const showMistake =
    last &&
    !last.byAi &&
    ["mistake", "blunder", "inaccuracy"].includes(last.classification);
  const showWhy = !!last;
  const showHint = phase === "awaiting-move";
  const showPrediction = !!quiz?.active;
  const showAnim = !!animation?.active;

  return (
    <aside className="coach-rail flex h-full flex-col overflow-y-auto border-l border-ink/10 bg-paper">
      <div className="sticky top-0 z-10 border-b border-ink/10 bg-paper px-3 py-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink/40">
          Coach rail
        </p>
      </div>
      <div className="flex flex-col gap-2 p-2">
        {/* High-priority learning moments first */}
        {showPrediction && (
          <div className="sticky top-10 z-20 ring-1 ring-ink/20">
            <PredictionCard />
          </div>
        )}
        {showAnim && <AnimatedDemoCard />}
        {showMistake && <MistakeAnalysisCard />}
        {showWhy && <WhyThisMoveCard />}
        <MoveEvaluationCard />
        <TacticalDetectionCard />
        {showHint && <HintLadderCard />}
        {showEndgame && <EndgameCoachCard />}
        <CoachConversationCard />
        <ReflectionCard />
        <ReplayCard />
        <AchievementCard />
      </div>
    </aside>
  );
}
