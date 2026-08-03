"use client";

import { create } from "zustand";
import type { Classification, EngineLine } from "@/lib/types";
import type { ChessGame } from "@/engines/rules/game";
import type {
  CoachExplainMode,
  EvalExplanation,
  GameLessonSummary,
  GuidedChecklist,
  HintLevel,
  HoverInsight,
  InterruptPayload,
  LearningEvent,
  PatternHit,
  PatternId,
  PredictionQuiz,
  PrincipleAlert,
  ProgressiveHint,
  TacticAnimation,
  ThinkSample,
  VisionMode,
} from "@/lib/tutorTypes";
import { MOTIF_LABELS } from "@/lib/tutorTypes";
import {
  finalizeGameProfile,
  loadLearnerProfile,
  pickTutorFocus,
  type LearnerProfile,
} from "@/lib/learnerProfile";
import { detectPatterns, motifsFromMove, tacticalRadar } from "@/engines/tutor/patterns";
import { explainEvalChange } from "@/engines/tutor/evalExplain";
import { buildInterrupt } from "@/engines/tutor/interruptions";
import { buildHintLadder } from "@/engines/tutor/hints";
import { detectPrinciples } from "@/engines/tutor/principles";
import { thinkTimeFeedback, emotionalPrediction } from "@/engines/tutor/emotional";
import {
  buildGuidedChecklist,
  getHoverInsight,
  visionSquares,
} from "@/engines/tutor/hoverInsight";
import { coachExplain } from "@/engines/tutor/coachModes";
import { buildLessonSummary } from "@/engines/tutor/lessonSummary";
import { explainMove } from "@/engines/tutor/moveExplain";
import type { MoveAnnotation } from "@/lib/types";
import { useCardStore } from "@/store/cardStore";
import { useAcademyStore } from "@/store/academyStore";

interface LearningState {
  profile: LearnerProfile | null;
  tutorFocus: PatternId[];

  // 1 Guided thinking
  checklist: GuidedChecklist | null;
  checklistOpen: boolean;

  // 2 Hover
  hover: HoverInsight | null;

  // 3 Predict AI move
  predictionQuiz: PredictionQuiz | null;

  // 4 Interruptions
  interrupt: InterruptPayload | null;
  pendingMoveUci: string | null;
  pendingMoveFrom: string | null;
  pendingMoveTo: string | null;

  // 5 Hints
  hintLevel: HintLevel;
  currentHint: ProgressiveHint | null;
  analysisLines: EngineLine[];

  // 6 Animation
  animation: TacticAnimation | null;

  // 7–8 Patterns + radar
  patterns: PatternHit[];
  radar: PatternHit[];
  highlightedPattern: PatternId | null;

  // 9 Timeline
  timeline: LearningEvent[];

  // 10 Eval explanation
  evalExplanation: EvalExplanation | null;

  // 11 Coach modes
  lastCoachText: string;
  coachArrows: { from: string; to: string; color: string }[];

  // 13 Think time
  thinkStartedAt: number | null;
  thinkSamples: ThinkSample[];
  thinkFeedback: string | null;

  // 14 Vision
  visionMode: VisionMode;
  visionSquareList: string[];

  // 15 Principles
  principles: PrincipleAlert[];

  // 18 Lesson summary
  lessonSummary: GameLessonSummary | null;

  // Board arrows / flash from systems
  boardArrows: { from: string; to: string; color: string }[];
  flashSquares: string[];

  initProfile: () => Promise<void>;
  onTurnStart: (game: ChessGame, isPlayerTurn: boolean, lines: EngineLine[]) => void;
  toggleChecklistItem: (id: string) => void;
  dismissChecklist: () => void;
  setHoverSquare: (game: ChessGame | null, square: string | null) => void;
  startPredictionQuiz: (game: ChessGame, lines: EngineLine[]) => void;
  answerPrediction: (uci: string) => void;
  dismissPredictionQuiz: () => void;
  requestHint: (game: ChessGame) => void;
  resetHints: () => void;
  cycleVision: (game: ChessGame, playerColor: "white" | "black") => void;
  selectPattern: (id: PatternId | null) => void;
  dismissAnimation: () => void;
  dismissInterrupt: () => void;
  /** Returns interrupt if should block; otherwise null and move may proceed */
  evaluatePlayerMove: (opts: {
    before: ChessGame;
    uci: string;
    from: string;
    to: string;
    classification: Classification;
    cpLoss: number;
    bestMoveSan?: string;
    bestMoveUci?: string;
    evalBefore: number;
    evalAfter: number;
    annotation: MoveAnnotation;
    playerColor: "white" | "black";
  }) => InterruptPayload | null;
  forceAcceptPendingMove: () => { uci: string; from: string; to: string } | null;
  clearPendingMove: () => void;
  explainMove: (
    mode: CoachExplainMode,
    before: ChessGame,
    annotation: MoveAnnotation
  ) => void;
  onGameEnd: (opts: {
    annotations: MoveAnnotation[];
    playerColor: "white" | "black";
  }) => Promise<GameLessonSummary>;
  markThinkStart: () => void;
  resetLearningSession: () => void;
}

const initialSession = {
  checklist: null as GuidedChecklist | null,
  checklistOpen: false,
  hover: null as HoverInsight | null,
  predictionQuiz: null as PredictionQuiz | null,
  interrupt: null as InterruptPayload | null,
  pendingMoveUci: null as string | null,
  pendingMoveFrom: null as string | null,
  pendingMoveTo: null as string | null,
  hintLevel: 0 as HintLevel,
  currentHint: null as ProgressiveHint | null,
  analysisLines: [] as EngineLine[],
  animation: null as TacticAnimation | null,
  patterns: [] as PatternHit[],
  radar: [] as PatternHit[],
  highlightedPattern: null as PatternId | null,
  timeline: [] as LearningEvent[],
  evalExplanation: null as EvalExplanation | null,
  lastCoachText: "",
  coachArrows: [] as { from: string; to: string; color: string }[],
  thinkStartedAt: null as number | null,
  thinkSamples: [] as ThinkSample[],
  thinkFeedback: null as string | null,
  visionMode: "off" as VisionMode,
  visionSquareList: [] as string[],
  principles: [] as PrincipleAlert[],
  lessonSummary: null as GameLessonSummary | null,
  boardArrows: [] as { from: string; to: string; color: string }[],
  flashSquares: [] as string[],
};

export const useLearningStore = create<LearningState>((set, get) => ({
  profile: null,
  tutorFocus: ["fork", "pin", "development"],
  ...initialSession,

  async initProfile() {
    const profile = await loadLearnerProfile();
    set({
      profile,
      tutorFocus: pickTutorFocus(profile),
    });
  },

  resetLearningSession() {
    set({ ...initialSession });
  },

  onTurnStart(game, isPlayerTurn, lines) {
    const patterns = detectPatterns(game);
    const radar = tacticalRadar(game);
    set({
      patterns,
      radar,
      analysisLines: lines,
      hintLevel: 0,
      currentHint: null,
      interrupt: null,
    });

    if (isPlayerTurn) {
      const cl = buildGuidedChecklist(game);
      set({
        checklist: { ...cl, dismissed: false, items: cl.items },
        checklistOpen: true,
        thinkStartedAt: Date.now(),
        principles: detectPrinciples(
          game,
          game.historySan,
          game.turn // player about to move
        ),
      });
    } else {
      set({ checklistOpen: false, thinkStartedAt: null });
    }
  },

  toggleChecklistItem(id) {
    const cl = get().checklist;
    if (!cl) return;
    set({
      checklist: {
        ...cl,
        items: cl.items.map((i) =>
          i.id === id ? { ...i, checked: !i.checked } : i
        ),
      },
    });
  },

  dismissChecklist() {
    const cl = get().checklist;
    if (!cl) return;
    set({ checklist: { ...cl, dismissed: true }, checklistOpen: false });
  },

  setHoverSquare(game, square) {
    if (!game || !square) {
      set({ hover: null });
      return;
    }
    set({ hover: getHoverInsight(game, square) });
  },

  startPredictionQuiz(game, lines) {
    const sorted = [...lines].sort((a, b) => b.scoreCp - a.scoreCp);
    if (sorted.length === 0) {
      set({ predictionQuiz: null });
      return;
    }
    const correct = sorted[0];
    const correctUci = correct.moveUci;
    const correctSan =
      game.sanForUci(correctUci) ?? correct.moveSan ?? correctUci;

    // Build 3 options: best + two alternatives or random legal
    const opts = sorted.slice(0, 3).map((l) => ({
      uci: l.moveUci,
      san: game.sanForUci(l.moveUci) ?? l.moveSan ?? l.moveUci,
    }));
    if (opts.length < 3) {
      for (const m of game.legalMoves()) {
        if (opts.some((o) => o.uci === m.uci)) continue;
        opts.push({ uci: m.uci, san: m.san });
        if (opts.length >= 3) break;
      }
    }
    // shuffle
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }

    let reason = "This move creates the strongest threat or defense.";
    try {
      reason = explainMove(game, correctUci).summary;
    } catch {
      /* keep default */
    }
    set({
      predictionQuiz: {
        active: true,
        options: opts,
        correctUci,
        correctSan,
        reason,
        resolved: false,
      },
    });
  },

  answerPrediction(uci) {
    const q = get().predictionQuiz;
    if (!q || q.resolved) return;
    const correct = uci === q.correctUci;
    const feedback = emotionalPrediction(
      correct,
      correct
        ? `Reason: ${q.reason}`
        : `The better move was ${q.correctSan}. ${q.reason}`
    );
    set({
      predictionQuiz: {
        ...q,
        playerChoice: uci,
        resolved: true,
        correct,
        feedback,
      },
    });
  },

  dismissPredictionQuiz() {
    set({ predictionQuiz: null });
  },

  requestHint(game) {
    const level = Math.min(5, get().hintLevel + 1) as HintLevel;
    const hint = buildHintLadder(game, get().analysisLines, level || 1);
    set({
      hintLevel: level || 1,
      currentHint: hint,
      boardArrows: (hint.arrows ?? []).map((a) => ({
        ...a,
        color: "#3C6E47",
      })),
      flashSquares: hint.squares ?? [],
    });
  },

  resetHints() {
    set({
      hintLevel: 0,
      currentHint: null,
      boardArrows: [],
      flashSquares: [],
    });
  },

  cycleVision(game, playerColor) {
    const order: VisionMode[] = ["off", "attacked", "undefended", "weak"];
    const cur = get().visionMode;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    const list =
      next === "off" ? [] : visionSquares(game, next, playerColor);
    set({ visionMode: next, visionSquareList: list });
  },

  selectPattern(id) {
    if (!id) {
      set({ highlightedPattern: null, boardArrows: [], flashSquares: [] });
      return;
    }
    const hit =
      get().patterns.find((p) => p.id === id) ??
      get().radar.find((p) => p.id === id);
    if (!hit || !hit.available) {
      set({ highlightedPattern: id });
      return;
    }
    set({
      highlightedPattern: id,
      boardArrows: (hit.arrows ?? []).map((a) => ({
        from: a.from,
        to: a.to,
        color: a.color ?? "#D0361E",
      })),
      flashSquares: hit.squares,
    });
  },

  dismissAnimation() {
    set({ animation: null });
  },

  dismissInterrupt() {
    set({ interrupt: null });
  },

  evaluatePlayerMove(opts) {
    const thinkMs = get().thinkStartedAt
      ? Date.now() - (get().thinkStartedAt as number)
      : undefined;

    const afterPos = opts.before.clone();
    afterPos.playUci(opts.uci);
    const evalExplanation = explainEvalChange(
      opts.before,
      afterPos,
      opts.evalBefore,
      opts.evalAfter
    );

    const motifs = motifsFromMove(opts.before, opts.uci);
    const themeLabels = motifs.map((m) => MOTIF_LABELS[m] ?? m);

    // Tactic animation for forks/pins etc.
    let animation: TacticAnimation | null = null;
    if (motifs.includes("fork") || motifs.includes("pin") || motifs.includes("skewer")) {
      const id = motifs.find((m) =>
        ["fork", "pin", "skewer"].includes(m)
      ) as PatternId;
      const after = opts.before.clone();
      after.playUci(opts.uci);
      const hit = detectPatterns(after).find((p) => p.id === id);
      animation = {
        active: true,
        motif: id,
        label: `NEW IDEA · ${MOTIF_LABELS[id]}`,
        description: hit?.description ?? MOTIF_LABELS[id],
        arrows: (hit?.arrows ?? [
          { from: opts.uci.slice(0, 2), to: opts.uci.slice(2, 4), color: "#3C6E47" },
        ]).map((a) => ({
          from: a.from,
          to: a.to,
          color: a.color ?? "#3C6E47",
        })),
        flashSquares: hit?.squares ?? [opts.uci.slice(2, 4)],
      };
    }

    const event: LearningEvent = {
      ply: opts.annotation.ply,
      moveNumber: Math.ceil(opts.annotation.ply / 2),
      san: opts.annotation.san,
      themes: themeLabels,
      thinkMs,
      classification: opts.classification,
    };

    const tf = thinkMs
      ? thinkTimeFeedback(thinkMs, opts.classification)
      : null;
    const samples = [...get().thinkSamples];
    if (thinkMs !== undefined) {
      samples.push({
        ply: opts.annotation.ply,
        ms: thinkMs,
        classification: opts.classification,
        note: tf ?? undefined,
      });
    }

    const principles = detectPrinciples(
      (() => {
        const g = opts.before.clone();
        g.playUci(opts.uci);
        return g;
      })(),
      [...opts.before.historySan, opts.annotation.san],
      opts.playerColor
    );

    const interrupt = buildInterrupt({
      classification: opts.classification,
      cpLoss: opts.cpLoss,
      san: opts.annotation.san,
      bestMoveSan: opts.bestMoveSan,
      bestMoveUci: opts.bestMoveUci,
    });

    set({
      evalExplanation,
      timeline: [...get().timeline, event],
      thinkSamples: samples,
      thinkFeedback: tf,
      thinkStartedAt: null,
      principles,
      animation,
      lastCoachText: opts.annotation.outcomeNote,
    });

    // Card system: critical moments, reflection, mission, XP
    try {
      const cards = useCardStore.getState();
      if (motifs.includes("fork")) cards.bumpMission("fork");
      if (
        opts.classification === "brilliant" ||
        opts.classification === "best"
      ) {
        cards.addXp(6);
      }
      if (["mistake", "blunder"].includes(opts.classification)) {
        cards.addCriticalMoment({
          ply: opts.annotation.ply,
          moveNumber: Math.ceil(opts.annotation.ply / 2),
          san: opts.annotation.san,
          kind: "missed",
          label:
            opts.classification === "blunder"
              ? "Major miss — review"
              : "Missed idea",
        });
        cards.openReflection(true);
      }
      if (opts.classification === "brilliant") {
        cards.addCriticalMoment({
          ply: opts.annotation.ply,
          moveNumber: Math.ceil(opts.annotation.ply / 2),
          san: opts.annotation.san,
          kind: "brilliant",
          label: "Brilliant idea",
        });
        cards.showAchievement("Brilliant find", opts.annotation.san);
      }
      if (motifs.length > 0) {
        cards.addXp(4);
      }
      cards.resetCandidates();
      // Adaptive academy: misses schedule spaced reviews on related lessons
      if (["mistake", "blunder"].includes(opts.classification) && motifs[0]) {
        try {
          useAcademyStore.getState().recordLiveMiss(String(motifs[0]));
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* optional */
    }

    if (interrupt) {
      set({
        interrupt,
        pendingMoveUci: opts.uci,
        pendingMoveFrom: opts.from,
        pendingMoveTo: opts.to,
      });
      return interrupt;
    }

    set({ pendingMoveUci: null, pendingMoveFrom: null, pendingMoveTo: null });
    return null;
  },

  forceAcceptPendingMove() {
    const { pendingMoveUci, pendingMoveFrom, pendingMoveTo } = get();
    if (!pendingMoveUci || !pendingMoveFrom || !pendingMoveTo) return null;
    set({
      interrupt: null,
      pendingMoveUci: null,
      pendingMoveFrom: null,
      pendingMoveTo: null,
    });
    return {
      uci: pendingMoveUci,
      from: pendingMoveFrom,
      to: pendingMoveTo,
    };
  },

  clearPendingMove() {
    set({
      interrupt: null,
      pendingMoveUci: null,
      pendingMoveFrom: null,
      pendingMoveTo: null,
    });
  },

  explainMove(mode, before, annotation) {
    const result = coachExplain({
      mode,
      before,
      uci: annotation.uci,
      san: annotation.san,
      classification: annotation.classification,
      evalExplanation: get().evalExplanation ?? undefined,
      bestMoveSan: annotation.bestMoveSan,
      byAi: !!annotation.byAi,
    });
    set({
      lastCoachText: result.text,
      coachArrows: result.arrows,
      boardArrows: result.arrows,
    });
  },

  async onGameEnd({ annotations, playerColor }) {
    const profileBefore = get().profile ?? (await loadLearnerProfile());
    const themeHits: { id: PatternId; success: boolean }[] = [];
    for (const e of get().timeline) {
      for (const t of e.themes) {
        const id = (Object.entries(MOTIF_LABELS).find(([, v]) => v === t)?.[0] ??
          t.toLowerCase()) as PatternId;
        const success = !["mistake", "blunder"].includes(e.classification ?? "");
        themeHits.push({ id, success });
      }
    }
    const skillDeltas: { id: import("@/lib/tutorTypes").SkillId; delta: number }[] = [
      { id: "tactical_vision", delta: themeHits.length > 0 ? 2 : 0 },
      { id: "calculation", delta: get().thinkSamples.some((t) => (t.ms ?? 0) > 15000) ? 2 : -1 },
      {
        id: "forks",
        delta: themeHits.filter((t) => t.id === "fork" && t.success).length * 3,
      },
      {
        id: "pins",
        delta: themeHits.filter((t) => t.id === "pin" && t.success).length * 3,
      },
    ];

    const profileAfter = finalizeGameProfile(profileBefore, {
      themesHit: themeHits,
      skillDeltas,
    });
    const { saveLearnerProfile } = await import("@/lib/learnerProfile");
    await saveLearnerProfile(profileAfter);

    const summary = buildLessonSummary({
      annotations,
      timeline: get().timeline,
      thinkSamples: get().thinkSamples,
      profileBefore,
      profileAfter,
      playerColor,
    });
    set({ profile: profileAfter, lessonSummary: summary, tutorFocus: pickTutorFocus(profileAfter) });
    return summary;
  },

  markThinkStart() {
    set({ thinkStartedAt: Date.now() });
  },
}));


