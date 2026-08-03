import type { Classification } from "@/lib/types";
import type { InterruptLevel } from "@/lib/tutorTypes";

/** Encouraging, informative language — never just "Blunder." */
export function emotionalOutcome(
  classification: Classification,
  san: string,
  bestMoveSan?: string
): string {
  switch (classification) {
    case "brilliant":
      return `Beautiful idea with ${san}! You found a motif most players miss.`;
    case "best":
      return `Great choice — ${san} matches the strongest idea in the position.`;
    case "good":
      return `Solid play with ${san}. You're keeping the position under control.`;
    case "inaccuracy":
      return bestMoveSan
        ? `Interesting choice with ${san}. There was a cleaner path (${bestMoveSan}) if you want to compare.`
        : `Interesting choice with ${san}. A small refinement was available.`;
    case "mistake":
      return bestMoveSan
        ? `Hmm — ${san} runs into trouble. Want to investigate? ${bestMoveSan} keeps things healthier.`
        : `Hmm — ${san} gives the opponent more than we'd like. Let's investigate.`;
    case "blunder":
      return bestMoveSan
        ? `That was a sharp moment. ${san} lets a big tactic through — the safer idea was ${bestMoveSan}. We'll learn from it, not dwell on it.`
        : `That was a sharp moment. Let's slow down and understand what changed.`;
    default:
      return `Move ${san} played.`;
  }
}

export function emotionalInterrupt(
  level: InterruptLevel,
  san: string,
  bestMoveSan?: string
): string {
  if (level === "forced_mate") {
    return `Pause — this path allows a forced mate. You're not in trouble yet if we rethink now.`;
  }
  if (level === "major") {
    return bestMoveSan
      ? `Interesting choice with ${san}. There was a much stronger continuation (${bestMoveSan}). Want to investigate it?`
      : `Interesting choice with ${san}. There was a much stronger continuation. Want to investigate it?`;
  }
  if (level === "minor") {
    return `Not a disaster — but ${san} drops something useful. A short look now will stick better than a post-mortem later.`;
  }
  return "";
}

export function emotionalPrediction(correct: boolean, reason: string): string {
  if (correct) {
    return `Correct! ${reason}`;
  }
  return `Close. ${reason}`;
}

export function thinkTimeFeedback(ms: number, classification?: string): string | null {
  if (ms >= 180000) {
    return `You spent ${Math.round(ms / 60000)}+ minutes here. Often the key is a single theme (open file, hanging piece, king air). Name the theme first, then the move.`;
  }
  if (ms >= 60000 && classification && ["best", "good"].includes(classification)) {
    return `Long think, good outcome — next time try spotting the pattern in under a minute once you know the motif.`;
  }
  if (ms <= 5000 && classification && ["mistake", "blunder"].includes(classification)) {
    return `You moved in about ${Math.max(1, Math.round(ms / 1000))} seconds. Most blunders happen under 5 seconds — a 10-second checklist would help.`;
  }
  if (ms <= 3000 && classification === "best") {
    return `Fast and accurate — nice pattern recognition.`;
  }
  return null;
}
