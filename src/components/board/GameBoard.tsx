"use client";

import { useCallback, useMemo } from "react";
import { Chessboard } from "react-chessboard";
import { useGameStore } from "@/store/gameStore";
import { useLearningStore } from "@/store/learningStore";
import { HoverCard } from "@/components/tutor/HoverCard";

export function GameBoard() {
  const fen = useGameStore((s) => s.fen);
  const orientation = useGameStore((s) => s.orientation);
  const phase = useGameStore((s) => s.phase);
  const playerColor = useGameStore((s) => s.playerColor);
  const selectedPly = useGameStore((s) => s.selectedPly);
  const hintUci = useGameStore((s) => s.hintUci);
  const lastOutcome = useGameStore((s) => s.lastOutcome);
  const playerMove = useGameStore((s) => s.playerMove);
  const game = useGameStore((s) => s.game);

  const boardArrows = useLearningStore((s) => s.boardArrows);
  const flashSquares = useLearningStore((s) => s.flashSquares);
  const visionSquareList = useLearningStore((s) => s.visionSquareList);
  const visionMode = useLearningStore((s) => s.visionMode);
  const setHoverSquare = useLearningStore((s) => s.setHoverSquare);
  const coachArrows = useLearningStore((s) => s.coachArrows);
  const animation = useLearningStore((s) => s.animation);
  const currentHint = useLearningStore((s) => s.currentHint);

  const interrupt = useLearningStore((s) => s.interrupt);
  const canMove =
    phase === "awaiting-move" && selectedPly === null && !interrupt;

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    for (const sq of visionSquareList) {
      if (visionMode === "attacked") {
        styles[sq] = {
          backgroundColor: "rgba(208, 54, 30, 0.22)",
        };
      } else if (visionMode === "undefended") {
        styles[sq] = {
          backgroundColor: "rgba(208, 54, 30, 0.4)",
        };
      } else if (visionMode === "weak") {
        styles[sq] = {
          backgroundColor: "rgba(60, 110, 71, 0.25)",
        };
      }
    }

    for (const sq of flashSquares) {
      styles[sq] = {
        ...styles[sq],
        boxShadow: "inset 0 0 0 3px rgba(60, 110, 71, 0.7)",
      };
    }

    if (animation?.flashSquares) {
      for (const sq of animation.flashSquares) {
        styles[sq] = {
          ...styles[sq],
          backgroundColor: "rgba(60, 110, 71, 0.35)",
        };
      }
    }

    if (hintUci && hintUci.length >= 4) {
      const from = hintUci.slice(0, 2);
      const to = hintUci.slice(2, 4);
      styles[from] = {
        ...styles[from],
        backgroundColor: "rgba(60, 110, 71, 0.35)",
      };
      styles[to] = {
        ...styles[to],
        backgroundColor: "rgba(60, 110, 71, 0.5)",
      };
    }

    if (currentHint?.squares) {
      for (const sq of currentHint.squares) {
        styles[sq] = {
          ...styles[sq],
          boxShadow: "inset 0 0 0 2px rgba(26,26,26,0.35)",
        };
      }
    }

    if (lastOutcome?.uci && lastOutcome.uci.length >= 4) {
      const from = lastOutcome.uci.slice(0, 2);
      const to = lastOutcome.uci.slice(2, 4);
      styles[from] = {
        ...styles[from],
        boxShadow: "inset 0 0 0 2px rgba(26,26,26,0.25)",
      };
      styles[to] = {
        ...styles[to],
        boxShadow: "inset 0 0 0 2px rgba(26,26,26,0.35)",
      };
    }
    return styles;
  }, [
    hintUci,
    lastOutcome,
    flashSquares,
    visionSquareList,
    visionMode,
    animation,
    currentHint,
  ]);

  const arrows = useMemo(() => {
    const list = [
      ...boardArrows,
      ...coachArrows,
      ...(animation?.arrows ?? []),
      ...(currentHint?.arrows?.map((a) => ({
        ...a,
        color: "#3C6E47",
      })) ?? []),
    ];
    // dedupe by from-to
    const seen = new Set<string>();
    return list.filter((a) => {
      const k = `${a.from}${a.to}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).map((a) => ({
      startSquare: a.from,
      endSquare: a.to,
      color: a.color ?? "#1A1A1A",
    }));
  }, [boardArrows, coachArrows, animation, currentHint]);

  const onPieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (!canMove || !targetSquare || !game) return false;
      if (useLearningStore.getState().interrupt) return false;
      const probe = game.clone();
      if (!probe.playFromTo(sourceSquare, targetSquare)) return false;
      void playerMove(sourceSquare, targetSquare);
      return true;
    },
    [canMove, playerMove, game]
  );

  return (
    <div className="relative w-full max-w-[min(100%,560px)] mx-auto aspect-square border border-ink/15 bg-paper">
      <Chessboard
        options={{
          id: "chessmentor-board",
          position: fen,
          boardOrientation: orientation,
          allowDragging: canMove,
          canDragPiece: ({ piece }) => {
            if (!canMove) return false;
            const isWhite = piece.pieceType.startsWith("w");
            return playerColor === "white" ? isWhite : !isWhite;
          },
          onPieceDrop,
          onMouseOverSquare: ({ square }) => {
            if (game && square) setHoverSquare(game, square);
          },
          onMouseOutSquare: () => setHoverSquare(null, null),
          squareStyles,
          arrows,
          allowDrawingArrows: true,
          showNotation: true,
          animationDurationInMs: 200,
          lightSquareStyle: { backgroundColor: "#F7F5F0" },
          darkSquareStyle: { backgroundColor: "#8A8680" },
          boardStyle: {
            borderRadius: 0,
            boxShadow: "none",
            width: "100%",
            height: "100%",
          },
        }}
      />
      <HoverCard />
    </div>
  );
}
