"use client";

import { useMemo, useState } from "react";
import { Card, CardBadge, CardRow, ProgressBar, StarRating } from "@/components/ui/Card";
import { useGameStore } from "@/store/gameStore";
import { useLearningStore } from "@/store/learningStore";
import { useCardStore } from "@/store/cardStore";
import {
  endgameLabel,
  getPositionContext,
} from "@/engines/tutor/positionContext";
import { explainMove } from "@/engines/tutor/moveExplain";
import { TACTICAL_RADAR_ORDER, MOTIF_LABELS } from "@/lib/tutorTypes";
import { ChessGame } from "@/engines/rules/game";
import { ClassificationIcon } from "@/components/tutor/ClassificationIcon";

/* ─── 1. Context Card ─── */
export function ContextCard() {
  const game = useGameStore((s) => s.game);
  const fen = useGameStore((s) => s.fen);
  if (!game) return null;
  // fen dep refreshes
  void fen;
  const ctx = getPositionContext(game);
  return (
    <Card eyebrow="Always on" title="Current position" tone="accent" compact>
      <CardRow label="Opening" value={ctx.openingName} />
      <CardRow
        label="Phase"
        value={
          <CardBadge>
            {ctx.phase === "opening"
              ? "Opening"
              : ctx.phase === "endgame"
                ? "Endgame"
                : "Middlegame"}
          </CardBadge>
        }
      />
      <CardRow label="Material" value={ctx.material} mono />
      <CardRow label="Initiative" value={ctx.initiative} />
      <CardRow label="King safety" value={ctx.kingSafety} />
      <CardRow
        label="Difficulty"
        value={
          <CardBadge
            tone={
              ctx.difficulty === "Advanced"
                ? "signal"
                : ctx.difficulty === "Beginner"
                  ? "good"
                  : "default"
            }
          >
            {ctx.difficulty}
          </CardBadge>
        }
      />
    </Card>
  );
}

/* ─── 2. Live Tactical Detection ─── */
export function TacticalDetectionCard() {
  const radar = useLearningStore((s) => s.radar);
  const selectPattern = useLearningStore((s) => s.selectPattern);
  const highlighted = useLearningStore((s) => s.highlightedPattern);
  const byId = useMemo(() => new Map(radar.map((r) => [r.id, r])), [radar]);
  const live = TACTICAL_RADAR_ORDER.filter((t) => byId.get(t.id)?.available);
  const grey = TACTICAL_RADAR_ORDER.filter((t) => !byId.get(t.id)?.available);

  return (
    <Card eyebrow="Engine motifs" title="Possible tactical ideas" compact>
      <ul className="space-y-1">
        {live.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => selectPattern(t.id)}
              className={`flex w-full items-center gap-2 px-1.5 py-1 text-left text-[12px] ${
                highlighted === t.id ? "bg-ink text-paper" : "hover:bg-ink/5"
              }`}
            >
              <span className="text-good">✓</span>
              <span>{t.label}</span>
            </button>
          </li>
        ))}
        {grey.slice(0, 5).map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-2 px-1.5 py-0.5 text-[12px] text-ink/25"
          >
            <span>○</span>
            <span>{t.label}</span>
          </li>
        ))}
      </ul>
      {live.length === 0 && (
        <p className="text-[11px] text-ink/40">No forcing motifs right now.</p>
      )}
    </Card>
  );
}

/* ─── 3. Candidate Move Card ─── */
export function CandidateMoveCard() {
  const phase = useGameStore((s) => s.phase);
  const game = useGameStore((s) => s.game);
  const candidates = useCardStore((s) => s.candidates);
  const updateCandidate = useCardStore((s) => s.updateCandidate);
  const submitCandidates = useCardStore((s) => s.submitCandidates);
  const submitted = useCardStore((s) => s.candidatesSubmitted);
  const feedback = useCardStore((s) => s.candidateFeedback);
  const lines = useLearningStore((s) => s.analysisLines);

  if (phase !== "awaiting-move") return null;

  const bestSan = game && lines[0]
    ? game.sanForUci(lines[0].moveUci) ?? lines[0].moveSan
    : undefined;

  return (
    <Card eyebrow="Think first" title="Think before moving" tone="good" compact>
      <p className="mb-2 text-[11px] text-ink/55">
        Find 3 candidate moves. Rate each. Mark your best. Submit before you play.
      </p>
      <ul className="space-y-2">
        {candidates.map((c, i) => (
          <li key={c.id} className="border border-ink/10 p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[10px] text-ink/40">#{i + 1}</span>
              <label className="flex items-center gap-1 text-[10px] text-ink/50">
                <input
                  type="radio"
                  name="best-cand"
                  checked={c.isBest}
                  onChange={() => {
                    candidates.forEach((x) =>
                      updateCandidate(x.id, { isBest: x.id === c.id })
                    );
                  }}
                />
                Best?
              </label>
            </div>
            <input
              value={c.san}
              onChange={(e) => updateCandidate(c.id, { san: e.target.value })}
              placeholder="e.g. Nf5"
              className="mb-1 w-full border border-ink/15 bg-transparent px-2 py-1 font-mono text-[12px] outline-none focus:border-ink"
            />
            <StarRating
              value={c.rating}
              onChange={(n) => updateCandidate(c.id, { rating: n })}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => submitCandidates(bestSan)}
        className="mt-3 w-full border border-ink bg-ink py-2 text-[11px] uppercase tracking-wider text-paper"
      >
        Submit candidates
      </button>
      {submitted && feedback && (
        <p className="mt-2 text-[11px] leading-relaxed text-ink/70">{feedback}</p>
      )}
    </Card>
  );
}

/* ─── 4. Why This Move ─── */
export function WhyThisMoveCard() {
  const last = useGameStore((s) => s.lastOutcome);
  const game = useGameStore((s) => s.game);
  const variant = useGameStore((s) => s.variant);
  if (!last || !game) return null;

  let reasons: string[] = [];
  try {
    const before = new ChessGame(variant, last.fenBefore, game.chess960Id);
    const ex = explainMove(before, last.uci);
    reasons = [
      ...ex.attackReasons.map((r) => r.charAt(0).toUpperCase() + r.slice(1)),
      ...ex.defenseReasons.map((r) => r.charAt(0).toUpperCase() + r.slice(1)),
      ...ex.otherReasons.map((r) => r.charAt(0).toUpperCase() + r.slice(1)),
    ].slice(0, 5);
  } catch {
    reasons = [last.planText || last.outcomeNote || "Positional improvement"].slice(0, 1);
  }

  return (
    <Card
      eyebrow={last.byAi ? "AI move" : "Your move"}
      title="Why this move?"
      tone={last.byAi ? "muted" : "default"}
      compact
      action={<ClassificationIcon classification={last.classification} showLabel />}
    >
      <p className="mb-2 font-mono text-[13px] text-ink">
        {last.byAi ? "I played" : "You played"}{" "}
        <strong>{last.san}</strong>
      </p>
      <p className="mb-1 text-[11px] text-ink/50">
        {last.byAi ? "Why is it strong / purposeful?" : "Why is it strong?"}
      </p>
      <ul className="space-y-1 text-[12px]">
        {reasons.map((r) => (
          <li key={r} className="flex gap-1.5">
            <span className="text-good">✓</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ─── 5. Mistake Analysis ─── */
export function MistakeAnalysisCard() {
  const last = useGameStore((s) => s.lastOutcome);
  const interrupt = useLearningStore((s) => s.interrupt);
  if (!last || last.byAi) return null;
  if (!["mistake", "blunder", "inaccuracy"].includes(last.classification)) {
    if (!interrupt) return null;
  }

  const severity =
    last.classification === "blunder"
      ? "Major"
      : last.classification === "mistake"
        ? "Significant"
        : "Minor";
  const type =
    last.cpLoss >= 500
      ? "Hanging heavy piece"
      : last.cpLoss >= 300
        ? "Overloaded defender / tactics"
        : last.cpLoss >= 100
          ? "Missed intermediate"
          : "Imprecision";

  return (
    <Card eyebrow="Error taxonomy" title="Mistake analysis" tone="signal" compact>
      <CardRow label="Type" value={type} />
      <CardRow
        label="Severity"
        value={<CardBadge tone="signal">{severity}</CardBadge>}
      />
      <CardRow
        label="Lost"
        value={
          last.cpLoss >= 300
            ? "Exchange+"
            : last.cpLoss >= 100
              ? "~Pawn / position"
              : "Slight edge"
        }
      />
      {last.bestMoveSan && (
        <CardRow label="Better" value={last.bestMoveSan} mono />
      )}
      <p className="mt-2 text-[11px] text-ink/55">
        Review links to your theme library — search for related patterns after the game.
      </p>
    </Card>
  );
}

/* ─── 6. Concept Card ─── */
export function ConceptCard() {
  const patterns = useLearningStore((s) => s.patterns);
  const animation = useLearningStore((s) => s.animation);
  const principles = useLearningStore((s) => s.principles);
  const selectPattern = useLearningStore((s) => s.selectPattern);

  const concept =
    animation?.motif ??
    patterns.find((p) => p.available)?.id ??
    null;
  const principle = principles[0];

  if (!concept && !principle) return null;

  const label = concept
    ? MOTIF_LABELS[concept] ?? concept
    : principle?.title ?? "Concept";
  const def =
    animation?.description ??
    patterns.find((p) => p.id === concept)?.description ??
    principle?.principle ??
    "";

  return (
    <Card eyebrow="Today's concept" title={label} tone="good" compact>
      <p className="text-[11px] font-mono uppercase tracking-wider text-ink/40">
        Definition
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink/80">{def}</p>
      {principle && (
        <p className="mt-2 text-[11px] text-ink/55">{principle.context}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {concept && (
          <button
            type="button"
            onClick={() => selectPattern(concept)}
            className="border border-ink/20 px-2 py-1 text-[10px] uppercase tracking-wider hover:bg-ink/5"
          >
            Highlight
          </button>
        )}
        <button
          type="button"
          className="border border-ink/20 px-2 py-1 text-[10px] uppercase tracking-wider hover:bg-ink/5"
        >
          Save
        </button>
      </div>
    </Card>
  );
}

/* ─── 7. Animated Demo Card ─── */
export function AnimatedDemoCard() {
  const animation = useLearningStore((s) => s.animation);
  const dismiss = useLearningStore((s) => s.dismissAnimation);
  const last = useGameStore((s) => s.lastOutcome);
  if (!animation?.active && !last) return null;
  if (!animation?.active) return null;

  return (
    <Card eyebrow="Visual" title="Watch" tone="good" compact>
      <p className="font-mono text-[10px] text-ink/40">~15s idea flash</p>
      <ol className="mt-2 space-y-1 text-[12px] text-ink/80">
        <li>① Wrong path risk</li>
        <li className="text-ink/30">↓</li>
        <li>② Correct idea: {animation.label}</li>
        <li className="text-ink/30">↓</li>
        <li>③ Winning / improving tactic</li>
      </ol>
      <p className="mt-2 text-[11px] text-ink/60">{animation.description}</p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-3 w-full border border-ink bg-ink py-1.5 text-[10px] uppercase tracking-wider text-paper"
      >
        Resume play
      </button>
    </Card>
  );
}

/* ─── 8. Hint Ladder Card ─── */
export function HintLadderCard() {
  const phase = useGameStore((s) => s.phase);
  const requestHint = useGameStore((s) => s.requestHint);
  const level = useLearningStore((s) => s.hintLevel);
  const hint = useLearningStore((s) => s.currentHint);
  const charge = useCardStore((s) => s.chargeHintXp);
  const cost = useCardStore((s) => s.hintXpCost);

  if (phase !== "awaiting-move") return null;

  return (
    <Card eyebrow="Discover" title="Hint ladder" compact>
      <p className="mb-2 text-[11px] text-ink/50">
        Each step costs {cost} XP. Discover before you reveal.
      </p>
      <div className="space-y-1 font-mono text-[11px] text-ink/40">
        {["Look for forcing moves", "Checks first", "Motif clue", "Visual path", "Solution"].map(
          (label, i) => {
            const n = i + 1;
            const done = level >= n;
            const current = level === n;
            return (
              <div
                key={label}
                className={`${done ? "text-ink" : ""} ${current ? "font-semibold" : ""}`}
              >
                Hint {n}
                {done ? " · " + (n === level && hint ? hint.text.slice(0, 48) : "✓") : ""}
                {n < 5 && <div className="pl-2 text-ink/20">↓</div>}
              </div>
            );
          }
        )}
      </div>
      {hint && (
        <p className="mt-2 text-[12px] leading-relaxed text-ink">{hint.text}</p>
      )}
      <button
        type="button"
        onClick={() => {
          charge();
          void requestHint();
        }}
        className="mt-3 w-full border border-ink/25 py-1.5 text-[11px] uppercase tracking-wider hover:bg-ink/5"
      >
        Next hint (−{cost} XP)
      </button>
    </Card>
  );
}

/* ─── 9. Prediction Card (inline, also modal exists) ─── */
export function PredictionCard() {
  const quiz = useLearningStore((s) => s.predictionQuiz);
  const answer = useLearningStore((s) => s.answerPrediction);
  const dismiss = useLearningStore((s) => s.dismissPredictionQuiz);
  const addXp = useCardStore((s) => s.addXp);

  if (!quiz?.active) return null;

  return (
    <Card eyebrow="Active learning" title="Predict opponent's best move" tone="accent" compact>
      {!quiz.resolved ? (
        <>
          <p className="mb-2 text-[11px] text-ink/55">
            What will I play? Choose before the move lands.
          </p>
          <div className="space-y-1.5">
            {quiz.options.map((o) => (
              <button
                key={o.uci}
                type="button"
                onClick={() => {
                  answer(o.uci);
                  if (o.uci === quiz.correctUci) addXp(15, "Prediction");
                }}
                className="w-full border border-ink/15 px-2 py-2 text-left font-mono text-[12px] hover:border-ink"
              >
                {o.san}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 text-[10px] text-ink/40 underline"
          >
            Skip
          </button>
        </>
      ) : (
        <>
          <p className={`text-[13px] font-medium ${quiz.correct ? "text-good" : "text-ink"}`}>
            {quiz.correct ? "Correct! +15 XP" : "Close"}
          </p>
          <p className="mt-1 text-[12px] text-ink/70">{quiz.feedback}</p>
          <p className="mt-2 text-[11px] text-ink/50">
            Reason: {quiz.reason.slice(0, 120)}
            {quiz.reason.length > 120 ? "…" : ""}
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 w-full border border-ink bg-ink py-1.5 text-[10px] uppercase text-paper"
          >
            Continue
          </button>
        </>
      )}
    </Card>
  );
}

/* ─── 10. Learning Progress ─── */
export function LearningProgressCard() {
  const profile = useLearningStore((s) => s.profile);
  const themes = profile?.themes.filter((t) => t.unlocked || t.mastery > 0) ?? [];
  const show = themes.length
    ? themes.sort((a, b) => b.mastery - a.mastery).slice(0, 5)
    : profile?.themes.slice(0, 5) ?? [];

  return (
    <Card eyebrow="Mastery" title="Learning progress" compact>
      <div className="space-y-2.5">
        {show.map((t) => (
          <ProgressBar key={t.id} label={t.label} value={t.mastery} />
        ))}
      </div>
    </Card>
  );
}

/* ─── 11. Pattern Collection ─── */
export function PatternCollectionCard() {
  const profile = useLearningStore((s) => s.profile);
  if (!profile) return null;
  const list = profile.themes.slice(0, 10);

  return (
    <Card eyebrow="Achievements" title="Pattern library" compact>
      <ul className="grid grid-cols-1 gap-0.5 text-[12px]">
        {list.map((t) => (
          <li
            key={t.id}
            className={`flex justify-between px-0.5 py-0.5 ${
              t.unlocked ? "text-ink" : "text-ink/25"
            }`}
          >
            <span>
              {t.unlocked ? "✓" : "□"} {t.label}
            </span>
            {t.unlocked && (
              <span className="font-mono text-[10px] text-ink/40">{t.mastery}%</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ─── 12. Coach Conversation ─── */
export function CoachConversationCard() {
  const [input, setInput] = useState("");
  const messages = useCardStore((s) => s.coachMessages);
  const push = useCardStore((s) => s.pushCoach);
  const game = useGameStore((s) => s.game);
  const last = useGameStore((s) => s.lastOutcome);
  const explain = useLearningStore((s) => s.explainMove);
  const variant = useGameStore((s) => s.variant);

  function reply(q: string) {
    push("user", q);
    const lower = q.toLowerCase();
    let text = "Look at checks, captures, and threats on this board first.";
    if (!game) {
      push("coach", "No position loaded yet.");
      return;
    }
    if (lower.includes("12") || lower.includes("kid") || lower.includes("simple")) {
      if (last) {
        try {
          const before = new ChessGame(variant, last.fenBefore, game.chess960Id);
          explain("like_10", before, last);
          text =
            useLearningStore.getState().lastCoachText ||
            "That move put a piece on a better square.";
        } catch {
          text = "You moved a piece to a safer or stronger square.";
        }
      } else {
        text = "Pretend each piece is a team player — who needs help?";
      }
    } else if (lower.includes("why") && last) {
      try {
        const before = new ChessGame(variant, last.fenBefore, game.chess960Id);
        explain("why_good", before, last);
        text = useLearningStore.getState().lastCoachText || last.outcomeNote;
      } catch {
        text = last.outcomeNote;
      }
    } else if (lower.includes("threat") || lower.includes("black") || lower.includes("white")) {
      const hang = game.legalMoves().filter((m) => m.captured).length;
      text =
        hang > 0
          ? `Right now there are ${hang} capture(s) available for the side to move. List them before anything quiet.`
          : "No immediate captures for the side to move — watch checks and loose pieces after your next try.";
    } else if (lower.includes("calculate")) {
      text =
        "Calculate in this order: checks → captures → threats. Stop at every forcing reply for both sides.";
    } else if (lower.includes("arrow")) {
      if (last) {
        try {
          const before = new ChessGame(variant, last.fenBefore, game.chess960Id);
          explain("show_arrows", before, last);
          text = "Arrows updated on the board for the last move.";
        } catch {
          text = "Play a move first so I can draw arrows.";
        }
      }
    } else {
      const ctx = getPositionContext(game);
      text = `This is a ${ctx.phase} (${ctx.openingName}). Material: ${ctx.material}. ${ctx.kingSafety}. What specifically do you want to understand?`;
    }
    push("coach", text);
  }

  const prompts = [
    "Why wasn't my move good?",
    "Explain like I'm 12",
    "What's the threat?",
    "What should I calculate?",
  ];

  return (
    <Card eyebrow="Live board chat" title="AI coach" compact>
      <div className="mb-2 max-h-36 space-y-2 overflow-y-auto">
        {messages.slice(-8).map((m) => (
          <div
            key={m.id}
            className={`text-[11px] leading-relaxed ${
              m.role === "user" ? "text-ink/50" : "text-ink"
            }`}
          >
            <span className="font-mono text-[9px] uppercase text-ink/35">
              {m.role === "user" ? "You" : "Coach"} ·{" "}
            </span>
            {m.text}
          </div>
        ))}
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => reply(p)}
            className="border border-ink/15 px-1.5 py-0.5 text-[10px] text-ink/60 hover:border-ink/40"
          >
            {p}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          reply(input.trim());
          setInput("");
        }}
        className="flex gap-1"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this board…"
          className="min-w-0 flex-1 border border-ink/15 px-2 py-1.5 text-[11px] outline-none focus:border-ink"
        />
        <button
          type="submit"
          className="border border-ink bg-ink px-2 text-[10px] uppercase text-paper"
        >
          Ask
        </button>
      </form>
    </Card>
  );
}

/* ─── 13. Opening Explorer ─── */
export function OpeningExplorerCard() {
  const game = useGameStore((s) => s.game);
  const fen = useGameStore((s) => s.fen);
  const last = useGameStore((s) => s.lastOutcome);
  if (!game) return null;
  void fen;
  const ctx = getPositionContext(game);
  if (!ctx.inTheory && ctx.phase !== "opening") return null;
  if (ctx.phase === "endgame") return null;
  if (game.historySan.length > 16) return null;

  const accuracy =
    last && !last.byAi && last.classification
      ? last.classification === "best" || last.classification === "good"
        ? 90
        : 70
      : 81;

  return (
    <Card eyebrow="Theory" title="Opening explorer" compact>
      <CardRow label="Opening" value={ctx.openingName} />
      <CardRow label="Popularity" value="★★★★☆" />
      <CardRow label="Your accuracy" value={`${accuracy}%`} mono />
      <p className="mt-2 text-[11px] text-ink/50">Common plans</p>
      <p className="text-[12px] text-ink/80">
        {ctx.openingName.includes("Queen")
          ? "Minority attack · Central break"
          : ctx.openingName.includes("Italian")
            ? "c3–d4 center · Piece play vs f7"
            : "Develop · Castle · Contest the center"}
      </p>
      <button
        type="button"
        className="mt-2 border border-ink/20 px-2 py-1 text-[10px] uppercase tracking-wider hover:bg-ink/5"
      >
        Study
      </button>
    </Card>
  );
}

/* ─── 14. Endgame Coach ─── */
export function EndgameCoachCard() {
  const game = useGameStore((s) => s.game);
  const fen = useGameStore((s) => s.fen);
  if (!game) return null;
  void fen;
  const ctx = getPositionContext(game);
  if (ctx.phase !== "endgame") return null;
  const eg = endgameLabel(game);

  return (
    <Card eyebrow="Phase shift" title="Endgame coach" tone="accent" compact>
      <CardRow label="Type" value={eg.name} />
      <CardRow label="Difficulty" value={eg.difficulty} />
      <p className="mt-2 text-[11px] font-mono uppercase text-ink/40">
        Essential idea
      </p>
      <p className="mt-1 text-[12px] text-ink/80">{eg.idea}</p>
      <button
        type="button"
        className="mt-3 border border-ink/20 px-2 py-1 text-[10px] uppercase tracking-wider hover:bg-ink/5"
      >
        Practice
      </button>
    </Card>
  );
}

/* ─── 15. Reflection Card ─── */
export function ReflectionCard() {
  const open = useCardStore((s) => s.reflectionOpen);
  const setReflection = useCardStore((s) => s.setReflection);
  const choice = useCardStore((s) => s.reflectionChoice);
  if (!open && !choice) return null;
  if (!open && choice) {
    return (
      <Card eyebrow="Metacognition" title="Reflection" compact>
        <p className="text-[12px] text-ink/70">
          You chose this move for: <strong>{choice}</strong>
        </p>
      </Card>
    );
  }

  const opts = ["Attack", "Defense", "Development", "Calculation", "Guess"];
  return (
    <Card eyebrow="Critical moment" title="Why did you choose this move?" tone="accent" compact>
      <div className="space-y-1.5">
        {opts.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setReflection(o)}
            className="flex w-full items-center gap-2 border border-ink/10 px-2 py-1.5 text-left text-[12px] hover:border-ink/30"
          >
            <span className="text-ink/30">○</span> {o}
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ─── 16. Daily Challenge ─── */
export function DailyChallengeCard() {
  const mission = useCardStore((s) => s.dailyMission);
  const pct = Math.round((mission.progress / mission.target) * 100);

  return (
    <Card eyebrow="Today" title="Daily mission" tone="good" compact>
      <p className="text-[12px] text-ink/80">
        Win moments using <strong>{mission.theme}</strong>
      </p>
      <div className="mt-2">
        <ProgressBar value={pct} label={`${mission.progress}/${mission.target}`} />
      </div>
      <CardRow label="Reward" value={`+${mission.rewardXp} XP`} mono />
    </Card>
  );
}

/* ─── 17. Replay Card ─── */
export function ReplayCard() {
  const moments = useCardStore((s) => s.criticalMoments);
  const jumpToPly = useGameStore((s) => s.jumpToPly);
  const phase = useGameStore((s) => s.phase);

  if (phase !== "game-over" && moments.length === 0) return null;
  if (moments.length === 0) {
    return (
      <Card eyebrow="After game" title="Replay critical moments" compact>
        <p className="text-[11px] text-ink/45">
          Instructive moments will appear here after mistakes and brilliancies.
        </p>
      </Card>
    );
  }

  return (
    <Card eyebrow="Review" title="Replay critical moments" compact>
      <ul className="space-y-2">
        {moments.map((m) => (
          <li
            key={m.ply}
            className="flex items-center justify-between gap-2 border-b border-ink/5 pb-1.5 text-[12px]"
          >
            <div>
              <span className="font-mono text-ink/40">Move {m.moveNumber}</span>{" "}
              <span className="font-mono">{m.san}</span>
              <p className="text-[11px] text-ink/55">{m.label}</p>
            </div>
            <button
              type="button"
              onClick={() => jumpToPly(m.ply)}
              className="shrink-0 border border-ink/20 px-2 py-1 text-[10px] uppercase tracking-wider hover:bg-ink/5"
            >
              Replay
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ─── 18. Adaptive Recommendation ─── */
export function AdaptiveRecommendationCard() {
  const profile = useLearningStore((s) => s.profile);
  const focus = useLearningStore((s) => s.tutorFocus);
  const weakest = profile
    ? [...profile.skills].sort((a, b) => a.mastery - b.mastery)[0]
    : null;

  return (
    <Card eyebrow="Next best" title="Recommended lesson" compact>
      <CardRow
        label="Weakness"
        value={weakest?.label ?? focus[0] ?? "Tactics"}
      />
      <CardRow label="Confidence" value="High" />
      <CardRow label="Est. time" value="7 min" mono />
      <button
        type="button"
        className="mt-3 w-full border border-ink bg-ink py-2 text-[11px] uppercase tracking-wider text-paper"
      >
        Start lesson
      </button>
    </Card>
  );
}

/* ─── 19. Achievement Card ─── */
export function AchievementCard() {
  const achievement = useCardStore((s) => s.achievement);
  const clear = useCardStore((s) => s.clearAchievement);
  if (!achievement) return null;

  return (
    <Card eyebrow="Milestone" title={achievement.title} tone="good" compact>
      <p className="text-[12px] text-ink/80">{achievement.detail}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-good">
        Gold-tier recognition
      </p>
      <button
        type="button"
        onClick={clear}
        className="mt-2 text-[10px] text-ink/40 underline"
      >
        Dismiss
      </button>
    </Card>
  );
}

/* ─── 20. Weekly Report ─── */
export function WeeklyReportCard() {
  const weekly = useCardStore((s) => s.weeklyStats);
  const profile = useLearningStore((s) => s.profile);
  const sessionXp = useCardStore((s) => s.sessionXp);

  return (
    <Card eyebrow="Growth" title="This week" compact>
      <CardRow label="Games" value={String(profile?.gamesPlayed ?? weekly.games)} mono />
      <CardRow label="Session XP" value={`+${sessionXp}`} mono />
      <CardRow
        label="Patterns touched"
        value={String(profile?.themes.filter((t) => t.unlocked).length ?? 0)}
        mono
      />
      <CardRow label="Best focus" value={weekly.bestImprovement} />
      <p className="mt-2 text-[11px] text-ink/45">
        Focus on growth rather than ranking.
      </p>
    </Card>
  );
}

/* ─── Move evaluation strip for coach rail ─── */
export function MoveEvaluationCard() {
  const evalExplanation = useLearningStore((s) => s.evalExplanation);
  const last = useGameStore((s) => s.lastOutcome);
  if (!evalExplanation && !last) return null;

  return (
    <Card eyebrow="Engine story" title="Move evaluation" compact>
      {last && (
        <div className="mb-2 flex items-center gap-2">
          <ClassificationIcon classification={last.classification} showLabel />
          <span className="font-mono text-[12px]">{last.san}</span>
        </div>
      )}
      {evalExplanation ? (
        <>
          <p className="text-[11px] text-ink/60">{evalExplanation.summary}</p>
          <ul className="mt-2 space-y-1 text-[12px]">
            {evalExplanation.factors.map((f) => (
              <li key={f.label}>
                <span className={f.sign === "+" ? "text-good" : "text-signal"}>
                  {f.sign}
                </span>{" "}
                {f.label}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-[11px] text-ink/45">Play a move to see evaluation factors.</p>
      )}
    </Card>
  );
}
