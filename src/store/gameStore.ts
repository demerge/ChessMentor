"use client";

import { create } from "zustand";
import type {
  AiTier,
  Classification,
  GameRecord,
  MoveAnnotation,
  PlayColor,
  StoredPrediction,
  TutorDetail,
  Variant,
} from "@/lib/types";
import { ChessGame } from "@/engines/rules/game";
import { analyzeForTurn, ensureEngineReady, getAiMove } from "@/engines/ai";
import {
  annotateMove,
  buildIntentNoteFromLines,
  detectThemes,
  accuracyFromAnnotations,
} from "@/engines/tutor";
import { newGameId, saveGame } from "@/lib/persistence";
import { TIER_META } from "@/lib/types";
import { useLearningStore } from "@/store/learningStore";
import { emotionalOutcome } from "@/engines/tutor/emotional";

export type GamePhase =
  | "idle"
  | "thinking-intent"
  | "awaiting-move"
  | "analyzing"
  | "ai-moving"
  | "game-over";

interface GameState {
  game: ChessGame | null;
  fen: string;
  variant: Variant;
  aiTier: AiTier;
  tutorDetail: TutorDetail;
  playerColor: "white" | "black";
  orientation: "white" | "black";
  phase: GamePhase;
  intentNote: string;
  lastOutcome: MoveAnnotation | null;
  annotations: MoveAnnotation[];
  /** AI's live prediction about the human's next move */
  prediction: StoredPrediction | null;
  /** Last AI monologue sections for the panel */
  aiReaction: string;
  aiPlan: string;
  aiPredictionText: string;
  coachTip: string;
  hintUci: string | null;
  hintSan: string | null;
  evalCp: number | null;
  selectedPly: number | null;
  error: string | null;
  gameId: string | null;
  result: GameRecord["result"];
  endReason?: string;
  savedRecord: GameRecord | null;
  engineReady: boolean;
  statusMessage: string;
  /** Snapshot used so AI can narrate "you played X instead of Y" */
  lastUserMoveUci: string | null;
  fenBeforeLastUserMove: string | null;

  startGame: (opts: {
    variant: Variant;
    aiTier: AiTier;
    tutorDetail: TutorDetail;
    playAs: PlayColor;
  }) => Promise<void>;
  playerMove: (from: string, to: string, promotion?: string) => Promise<boolean>;
  requestHint: () => Promise<void>;
  resolveLearningInterrupt: (
    action: "continue" | "show" | "undo" | "hint"
  ) => Promise<void>;
  undo: () => Promise<void>;
  resign: () => Promise<void>;
  flipBoard: () => void;
  jumpToPly: (ply: number | null) => void;
  reset: () => void;
}

function pickColor(playAs: PlayColor): "white" | "black" {
  if (playAs === "random") return Math.random() < 0.5 ? "white" : "black";
  return playAs;
}

async function maybeSave(
  get: () => GameState,
  set: (p: Partial<GameState>) => void
) {
  const s = get();
  if (!s.game || s.result === "*") return;

  const whiteLosses = s.annotations
    .filter((_, i) => i % 2 === 0)
    .map((a) => a.cpLoss);
  const blackLosses = s.annotations
    .filter((_, i) => i % 2 === 1)
    .map((a) => a.cpLoss);

  const whiteName =
    s.playerColor === "white" ? "You" : `AI (${TIER_META[s.aiTier].label})`;
  const blackName =
    s.playerColor === "black" ? "You" : `AI (${TIER_META[s.aiTier].label})`;

  const record: GameRecord = {
    id: s.gameId ?? newGameId(),
    variant: s.variant,
    aiTier: s.aiTier,
    playerColor: s.playerColor,
    pgn: s.game.toPgn({
      White: whiteName,
      Black: blackName,
      Result: s.result,
    }),
    result: s.result,
    accuracy: {
      white: accuracyFromAnnotations(whiteLosses),
      black: accuracyFromAnnotations(blackLosses),
    },
    annotations: s.annotations,
    themes: detectThemes(s.annotations),
    createdAt: new Date().toISOString(),
    endReason: s.endReason,
  };

  await saveGame(record);
  set({ savedRecord: record, gameId: record.id });

  try {
    const summary = await useLearningStore.getState().onGameEnd({
      annotations: s.annotations,
      playerColor: s.playerColor,
    });
    // stash on record via savedRecord extension if needed
    void summary;
  } catch {
    /* profile optional */
  }
}

function waitForPrediction(maxMs: number): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const q = useLearningStore.getState().predictionQuiz;
      if (!q || !q.active || q.resolved) {
        // brief beat so user reads feedback
        setTimeout(() => {
          useLearningStore.getState().dismissPredictionQuiz();
          resolve();
        }, q?.resolved ? 1200 : 0);
        return;
      }
      if (Date.now() - start > maxMs) {
        useLearningStore.getState().dismissPredictionQuiz();
        resolve();
        return;
      }
      setTimeout(tick, 200);
    };
    tick();
  });
}

async function prepareTurn(
  get: () => GameState,
  set: (p: Partial<GameState>) => void
) {
  const s = get();
  if (!s.game) return;
  const snap = s.game.snapshot();
  if (snap.isGameOver) {
    set({
      phase: "game-over",
      result: snap.result,
      endReason: snap.endReason,
      fen: snap.fen,
      statusMessage: snap.endReason ?? "Game over",
    });
    await maybeSave(get, set);
    return;
  }

  const isPlayerTurn = snap.turn === s.playerColor;
  set({
    phase: "thinking-intent",
    statusMessage: isPlayerTurn
      ? "Coach is preparing guidance…"
      : "I am planning my move…",
    hintUci: null,
    hintSan: null,
    error: null,
  });

  let lines: Awaited<ReturnType<typeof analyzeForTurn>> = [];
  try {
    lines = await analyzeForTurn(s.game, s.aiTier);
  } catch {
    lines = [];
  }

  const learn = useLearningStore.getState();
  learn.onTurnStart(s.game, isPlayerTurn, lines);

  if (isPlayerTurn) {
    const intent = buildIntentNoteFromLines(
      s.game,
      s.tutorDetail,
      false,
      lines,
      s.prediction
    );
    set({
      intentNote: intent,
      phase: "awaiting-move",
      statusMessage: "Your move — use the checklist, then move",
      fen: s.game.fen,
    });
    return;
  }

  // ——— AI turn: optional prediction quiz, then move ———
  set({
    phase: "ai-moving",
    statusMessage: "Predict my move…",
    intentNote:
      "Before I move: try to predict my idea. Then I'll explain attack, defense, and what I expect from you.",
  });

  // Prediction quiz (layer 3) — only if multipv available
  if (lines.length >= 1) {
    learn.startPredictionQuiz(s.game, lines);
    // Wait until quiz dismissed or answered (max ~25s, auto-continue)
    await waitForPrediction(25000);
  }

  set({
    statusMessage: "I am choosing and explaining my move…",
  });

  try {
    const line = await getAiMove(s.game, s.aiTier, lines);
    if (!line?.moveUci) throw new Error("AI produced no move");
    await applyMove(get, set, line.moveUci, "", lines, true);
  } catch (e) {
    const legal = s.game.legalMoves();
    if (legal.length > 0) {
      const pick = legal[Math.floor(Math.random() * legal.length)];
      try {
        await applyMove(get, set, pick.uci, "", lines, true);
        return;
      } catch {
        /* fall through */
      }
    }
    set({
      error: e instanceof Error ? e.message : "AI failed",
      phase: "awaiting-move",
      statusMessage: "AI error — try takeback or resign",
    });
  }
}

async function applyMove(
  get: () => GameState,
  set: (p: Partial<GameState>) => void,
  uci: string,
  intentNote: string,
  precomputedLines?: Awaited<ReturnType<typeof analyzeForTurn>>,
  isAi = false
) {
  const s = get();
  if (!s.game) return false;

  const before = s.game.clone();
  let userBefore: ChessGame | null = null;
  if (isAi && s.fenBeforeLastUserMove) {
    try {
      userBefore = new ChessGame(
        s.variant,
        s.fenBeforeLastUserMove,
        s.game.chess960Id
      );
    } catch {
      userBefore = null;
    }
  }

  if (!s.game.playUci(uci)) {
    set({ error: "Illegal move", phase: "awaiting-move" });
    return false;
  }

  const snapEarly = s.game.snapshot();
  set({
    fen: snapEarly.fen,
    phase: "analyzing",
    statusMessage: isAi
      ? "Explaining attack, defense, and my prediction…"
      : "Reviewing your move…",
    selectedPly: null,
    hintUci: null,
    hintSan: null,
  });

  let annotation: MoveAnnotation;
  let nextPrediction: StoredPrediction | null = s.prediction;

  try {
    const result = await annotateMove(
      before,
      uci,
      s.tutorDetail,
      intentNote,
      precomputedLines,
      {
        isAi,
        pending: s.prediction,
        gameBeforeUserMove: userBefore,
        lastUserUci: isAi ? s.lastUserMoveUci : null,
      }
    );
    annotation = result.annotation;
    if (isAi) {
      nextPrediction = result.nextPrediction;
    } else {
      // Keep existing prediction until AI reacts; mark that user moved
      nextPrediction = s.prediction;
    }
  } catch (e) {
    s.game.undo();
    set({
      fen: s.game.fen,
      error: e instanceof Error ? e.message : "Analysis failed",
      phase: "awaiting-move",
      statusMessage: "Your move",
    });
    return false;
  }

  const snap = s.game.snapshot();
  const annotations = [...s.annotations, annotation];
  const evalWhite =
    annotation.ply % 2 === 1 ? annotation.evalAfter : -annotation.evalAfter;

  if (isAi) {
    set({
      fen: snap.fen,
      annotations,
      lastOutcome: annotation,
      evalCp: evalWhite,
      selectedPly: null,
      prediction: nextPrediction,
      aiReaction: annotation.reactionText ?? "",
      aiPlan: annotation.planText ?? "",
      aiPredictionText: annotation.predictionText ?? "",
      coachTip: annotation.coachTip ?? "",
      intentNote: annotation.planText ?? annotation.intentNote,
      lastUserMoveUci: null,
      fenBeforeLastUserMove: null,
    });
  } else {
    set({
      fen: snap.fen,
      annotations,
      lastOutcome: annotation,
      evalCp: evalWhite,
      selectedPly: null,
      intentNote: annotation.outcomeNote,
      aiReaction: "",
      aiPlan: "",
      // keep prediction text visible until AI responds
      aiPredictionText: s.prediction?.predictionText ?? "",
      coachTip: "",
      lastUserMoveUci: uci,
      fenBeforeLastUserMove: before.fen,
    });
  }

  if (snap.isGameOver) {
    set({
      phase: "game-over",
      result: snap.result,
      endReason: snap.endReason,
      statusMessage: snap.endReason ?? "Game over",
    });
    await maybeSave(get, set);
    return true;
  }

  await prepareTurn(get, set);
  return true;
}

export const useGameStore = create<GameState>((set, get) => ({
  game: null,
  fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  variant: "standard",
  aiTier: "club",
  tutorDetail: "short",
  playerColor: "white",
  orientation: "white",
  phase: "idle",
  intentNote: "",
  lastOutcome: null,
  annotations: [],
  prediction: null,
  aiReaction: "",
  aiPlan: "",
  aiPredictionText: "",
  coachTip: "",
  hintUci: null,
  hintSan: null,
  evalCp: null,
  selectedPly: null,
  error: null,
  gameId: null,
  result: "*",
  endReason: undefined,
  savedRecord: null,
  engineReady: false,
  statusMessage: "",
  lastUserMoveUci: null,
  fenBeforeLastUserMove: null,

  async startGame({ variant, aiTier, tutorDetail, playAs }) {
    const playerColor = pickColor(playAs);
    const game = new ChessGame(variant);
    const gameId = newGameId();

    useLearningStore.getState().resetLearningSession();
    void useLearningStore.getState().initProfile();

    set({
      game,
      fen: game.fen,
      variant,
      aiTier,
      tutorDetail,
      playerColor,
      orientation: playerColor,
      phase: "thinking-intent",
      intentNote: "",
      lastOutcome: null,
      annotations: [],
      prediction: null,
      aiReaction: "",
      aiPlan: "",
      aiPredictionText: "",
      coachTip: "",
      hintUci: null,
      hintSan: null,
      evalCp: 0,
      selectedPly: null,
      error: null,
      gameId,
      result: "*",
      endReason: undefined,
      savedRecord: null,
      statusMessage: "Loading engine…",
      engineReady: false,
      lastUserMoveUci: null,
      fenBeforeLastUserMove: null,
    });

    try {
      await ensureEngineReady(variant);
      set({ engineReady: true });
    } catch {
      set({ engineReady: false, statusMessage: "Using built-in engine" });
    }

    await prepareTurn(get, set);
  },

  async resolveLearningInterrupt(
    action: "continue" | "show" | "undo" | "hint"
  ) {
    const s = get();
    const learn = useLearningStore.getState();
    if (action === "undo") {
      learn.clearPendingMove();
      set({
        phase: "awaiting-move",
        statusMessage: "Take another look — checklist first",
      });
      return;
    }
    if (action === "hint") {
      if (s.game) learn.requestHint(s.game);
      return;
    }
    if (action === "show") {
      if (s.game) {
        // jump hints to level 5
        for (let i = 0; i < 5; i++) learn.requestHint(s.game);
      }
      // still allow continue after show — user clicks continue
      return;
    }
    // continue — play the held move
    const pending = learn.forceAcceptPendingMove();
    if (!pending || !s.game) return;
    await applyMove(get, set, pending.uci, s.intentNote, undefined, false);
  },

  async playerMove(from, to, promotion) {
    const s = get();
    if (!s.game || s.phase !== "awaiting-move") return false;
    if (s.selectedPly !== null) return false;
    if (s.game.turn !== s.playerColor) return false;
    // Block while interrupt modal open
    if (useLearningStore.getState().interrupt) return false;

    const promo = promotion as
      | "queen"
      | "rook"
      | "bishop"
      | "knight"
      | undefined;
    const probe = s.game.clone();
    if (!probe.playFromTo(from, to, promo)) return false;
    const uci = probe.historyUci[probe.historyUci.length - 1];

    // Pre-analyze for intelligent interruption (layer 4)
    set({ phase: "analyzing", statusMessage: "Checking the idea…" });
    try {
      const { annotation } = await annotateMove(
        s.game.clone(),
        uci,
        s.tutorDetail,
        s.intentNote,
        undefined,
        { isAi: false, pending: s.prediction }
      );
      // Emotional overlay
      annotation.outcomeNote =
        emotionalOutcome(
          annotation.classification,
          annotation.san,
          annotation.bestMoveSan
        ) +
        "\n\n" +
        annotation.outcomeNote;

      const interrupt = useLearningStore.getState().evaluatePlayerMove({
        before: s.game.clone(),
        uci,
        from,
        to,
        classification: annotation.classification,
        cpLoss: annotation.cpLoss,
        bestMoveSan: annotation.bestMoveSan,
        bestMoveUci: annotation.bestMoveUci,
        evalBefore: annotation.evalBefore,
        evalAfter: annotation.evalAfter,
        annotation,
        playerColor: s.playerColor,
      });

      if (interrupt) {
        set({
          phase: "awaiting-move",
          statusMessage: "Learning pause — choose how to continue",
        });
        return false;
      }
    } catch {
      // fall through to normal apply
    }

    return applyMove(get, set, uci, s.intentNote, undefined, false);
  },

  async requestHint() {
    const s = get();
    if (!s.game || s.phase !== "awaiting-move") return;
    useLearningStore.getState().requestHint(s.game);
    const h = useLearningStore.getState().currentHint;
    set({
      hintUci: h?.revealUci ?? null,
      hintSan: h?.revealUci
        ? s.game.sanForUci(h.revealUci) ?? h.revealUci
        : null,
      statusMessage: h?.text ?? "Hint",
    });
  },

  async undo() {
    const s = get();
    if (!s.game || s.annotations.length === 0) return;
    if (s.phase === "ai-moving" || s.phase === "analyzing") return;

    let undos = 1;
    if (s.annotations.length >= 2 && s.game.turn === s.playerColor) {
      undos = 2;
    }

    for (let i = 0; i < undos; i++) {
      s.game.undo();
    }
    const annotations = s.annotations.slice(0, -undos);
    const lastAi = [...annotations].reverse().find((a) => a.byAi);

    set({
      fen: s.game.fen,
      annotations,
      lastOutcome: annotations[annotations.length - 1] ?? null,
      result: "*",
      endReason: undefined,
      phase: "awaiting-move",
      selectedPly: null,
      savedRecord: null,
      prediction: lastAi?.predictionText
        ? s.prediction
        : null,
      lastUserMoveUci: null,
      fenBeforeLastUserMove: null,
    });
    await prepareTurn(get, set);
  },

  async resign() {
    const s = get();
    if (!s.game || s.phase === "game-over") return;
    const result = s.playerColor === "white" ? "0-1" : "1-0";
    set({
      phase: "game-over",
      result,
      endReason: "Resignation",
      statusMessage: "You resigned",
    });
    await maybeSave(get, set);
  },

  flipBoard() {
    set((st) => ({
      orientation: st.orientation === "white" ? "black" : "white",
    }));
  },

  jumpToPly(ply) {
    const s = get();
    if (!s.game) return;
    if (ply === null) {
      set({ selectedPly: null, fen: s.game.fen });
      return;
    }
    const ann = s.annotations.find((a) => a.ply === ply);
    if (ann) set({ selectedPly: ply, fen: ann.fenAfter });
  },

  reset() {
    set({
      game: null,
      phase: "idle",
      annotations: [],
      lastOutcome: null,
      intentNote: "",
      prediction: null,
      aiReaction: "",
      aiPlan: "",
      aiPredictionText: "",
      coachTip: "",
      savedRecord: null,
      result: "*",
    });
  },
}));

export type { Classification };
