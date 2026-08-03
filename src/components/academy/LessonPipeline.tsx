"use client";

import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { ChessGame } from "@/engines/rules/game";
import type { AcademyLesson, LessonStep } from "@/academy/types";
import { STAGE_LABELS } from "@/academy/types";
import { useAcademyStore } from "@/store/academyStore";
import { Card } from "@/components/ui/Card";

function PipelineNav({
  steps,
  index,
  onJump,
}: {
  steps: LessonStep[];
  index: number;
  onJump: (i: number) => void;
}) {
  return (
    <ol className="flex flex-wrap gap-1 border-b border-ink/10 pb-3">
      {steps.map((s, i) => (
        <li key={s.stage + i}>
          <button
            type="button"
            onClick={() => onJump(i)}
            className={`px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${
              i === index
                ? "bg-ink text-paper"
                : i < index
                  ? "border border-good/40 text-good"
                  : "border border-ink/15 text-ink/40"
            }`}
          >
            {i + 1}. {STAGE_LABELS[s.stage]}
          </button>
        </li>
      ))}
    </ol>
  );
}

function PuzzleBoard({
  step,
  onResult,
}: {
  step: LessonStep;
  onResult: (ok: boolean) => void;
}) {
  const puzzle = step.puzzle!;
  const [fen, setFen] = useState(puzzle.fen);
  const [status, setStatus] = useState<string | null>(null);
  const [hintOn, setHintOn] = useState(false);

  const game = useMemo(() => {
    try {
      return new ChessGame("standard", fen);
    } catch {
      return new ChessGame("standard");
    }
  }, [fen]);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,340px)_1fr]">
      <div className="border border-ink/15">
        <Chessboard
          options={{
            id: "academy-puzzle",
            position: fen,
            boardOrientation: puzzle.playerColor,
            allowDragging: true,
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!targetSquare) return false;
              const g = new ChessGame("standard", fen);
              if (!g.playFromTo(sourceSquare, targetSquare)) return false;
              const uci = g.historyUci[g.historyUci.length - 1];
              setFen(g.fen);
              if (puzzle.solutionUci.includes(uci)) {
                setStatus("Correct!");
                onResult(true);
              } else {
                setStatus("Not the key move — try again or use a hint.");
                onResult(false);
                // soft reset optional
              }
              return true;
            },
            lightSquareStyle: { backgroundColor: "#F7F5F0" },
            darkSquareStyle: { backgroundColor: "#8A8680" },
            boardStyle: { width: "100%" },
          }}
        />
      </div>
      <div className="space-y-3 text-[13px]">
        <p className="text-ink/80">{step.body || puzzle.goal}</p>
        <p className="font-mono text-[11px] text-ink/45">
          Side to move: {puzzle.playerColor} · legal ideas: {game.legalMoves().length}
        </p>
        {hintOn && (
          <p className="border border-good/30 bg-good/5 p-2 text-[12px] text-ink/80">
            Hint: {puzzle.hint}
          </p>
        )}
        {status && (
          <p
            className={
              status.startsWith("Correct") ? "text-good" : "text-signal"
            }
          >
            {status}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setHintOn(true)}
            className="border border-ink/20 px-3 py-1.5 text-[11px] uppercase tracking-wider"
          >
            Hint
          </button>
          <button
            type="button"
            onClick={() => {
              setFen(puzzle.fen);
              setStatus(null);
            }}
            className="border border-ink/20 px-3 py-1.5 text-[11px] uppercase tracking-wider"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export function LessonPipeline({ lesson }: { lesson: AcademyLesson }) {
  const stageIndex = useAcademyStore((s) => s.stageIndex);
  const setStage = useAcademyStore((s) => s.setStage);
  const nextStage = useAcademyStore((s) => s.nextStage);
  const prevStage = useAcademyStore((s) => s.prevStage);
  const completeQuiz = useAcademyStore((s) => s.completeQuiz);
  const completePuzzle = useAcademyStore((s) => s.completePuzzle);
  const finishLesson = useAcademyStore((s) => s.finishLesson);
  const lastFeedback = useAcademyStore((s) => s.lastFeedback);
  const progress = useAcademyStore((s) => s.getLessonProgress(lesson.id));

  const step = lesson.steps[stageIndex] ?? lesson.steps[0];
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      <header className="border-b border-ink/10 pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40">
          {lesson.kind} · ~{lesson.estimatedMinutes} min · difficulty{" "}
          {"★".repeat(lesson.difficulty)}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{lesson.title}</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-ink/60">{lesson.summary}</p>
        {lesson.masteryLoop && (
          <p className="mt-2 font-mono text-[11px] text-good">
            {lesson.masteryLoop.map((x) => x.toUpperCase()).join(" → ")}
          </p>
        )}
        {progress && (
          <p className="mt-1 font-mono text-[11px] text-ink/40">
            Mastery {progress.mastery}% · reviews scheduled
          </p>
        )}
      </header>

      <PipelineNav
        steps={lesson.steps}
        index={stageIndex}
        onJump={setStage}
      />

      <Card
        eyebrow={STAGE_LABELS[step.stage]}
        title={step.title}
        tone={
          step.stage === "practice"
            ? "good"
            : step.stage === "assess"
              ? "accent"
              : "default"
        }
      >
        {/* Explain */}
        {step.stage === "explain" && (
          <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink/85">
            {step.body}
          </div>
        )}

        {/* Demonstrate */}
        {step.stage === "demonstrate" && (
          <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
            {step.fen && (
              <div className="border border-ink/15">
                <Chessboard
                  options={{
                    id: "academy-demo",
                    position: step.fen,
                    allowDragging: false,
                    arrows: (step.arrows ?? []).map((a) => ({
                      startSquare: a.from,
                      endSquare: a.to,
                      color: a.color ?? "#3C6E47",
                    })),
                    squareStyles: Object.fromEntries(
                      (step.highlights ?? []).map((sq) => [
                        sq,
                        { backgroundColor: "rgba(60,110,71,0.35)" },
                      ])
                    ),
                    lightSquareStyle: { backgroundColor: "#F7F5F0" },
                    darkSquareStyle: { backgroundColor: "#8A8680" },
                    boardStyle: { width: "100%" },
                  }}
                />
              </div>
            )}
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink/80">
              {step.body}
            </p>
          </div>
        )}

        {/* Guided quiz */}
        {(step.stage === "guided" || step.stage === "assess") && step.quiz && (
          <div className="space-y-3">
            {step.body && (
              <p className="text-[13px] text-ink/70">{step.body}</p>
            )}
            <p className="text-[13px] font-medium">{step.quiz.prompt}</p>
            <div className="space-y-1.5">
              {step.quiz.choices.map((c, i) => {
                const show = picked !== null;
                const correct = i === step.quiz!.correctIndex;
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={picked !== null}
                    onClick={() => {
                      setPicked(i);
                      completeQuiz(i === step.quiz!.correctIndex);
                    }}
                    className={`block w-full border px-3 py-2 text-left text-[12px] ${
                      show && correct
                        ? "border-good bg-good/10"
                        : show && picked === i
                          ? "border-signal bg-signal/10"
                          : "border-ink/15 hover:border-ink/40"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}. {c}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <p className="text-[12px] text-ink/70">{step.quiz.explanation}</p>
            )}
          </div>
        )}

        {/* Practice / review puzzle */}
        {(step.stage === "practice" || step.stage === "review") &&
          step.puzzle && (
            <PuzzleBoard
              step={step}
              onResult={(ok) => completePuzzle(ok)}
            />
          )}

        {/* Review without puzzle */}
        {step.stage === "review" && !step.puzzle && (
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
            {step.body}
          </p>
        )}

        {lastFeedback && (
          <p className="mt-4 border-t border-ink/10 pt-3 font-mono text-[11px] text-ink/50">
            {lastFeedback}
          </p>
        )}
      </Card>

      {lesson.masters && lesson.masters.length > 0 && stageIndex === 0 && (
        <Card eyebrow="Grandmaster database" title="Linked masters" compact>
          <ul className="space-y-1 text-[12px]">
            {lesson.masters.map((m) => (
              <li key={m.name}>
                <strong>{m.name}</strong> — {m.note}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-4">
        <button
          type="button"
          onClick={prevStage}
          disabled={stageIndex === 0}
          className="border border-ink/20 px-4 py-2 text-[11px] uppercase tracking-wider disabled:opacity-30"
        >
          Back
        </button>
        <div className="flex gap-2">
          {stageIndex >= lesson.steps.length - 1 ? (
            <>
              <button
                type="button"
                onClick={() => finishLesson(1)}
                className="border border-ink/20 px-3 py-2 text-[11px] uppercase"
              >
                Hard
              </button>
              <button
                type="button"
                onClick={() => finishLesson(2)}
                className="border border-ink bg-ink px-4 py-2 text-[11px] uppercase text-paper"
              >
                Complete (good)
              </button>
              <button
                type="button"
                onClick={() => finishLesson(3)}
                className="border border-good/40 px-3 py-2 text-[11px] uppercase text-good"
              >
                Easy
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPicked(null);
                nextStage();
              }}
              className="border border-ink bg-ink px-4 py-2 text-[11px] uppercase tracking-wider text-paper"
            >
              Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
