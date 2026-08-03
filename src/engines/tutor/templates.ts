import type { Classification } from "@/lib/types";

/** Post-game theme labels derived from annotation notes. */
export function detectThemes(
  annotations: {
    classification: Classification;
    outcomeNote: string;
    san: string;
  }[]
): string[] {
  const themes = new Set<string>();
  const bad = annotations.filter((a) =>
    ["inaccuracy", "mistake", "blunder"].includes(a.classification)
  );
  const text = bad.map((a) => a.outcomeNote.toLowerCase()).join(" ");

  if (text.includes("material") || text.includes("drops material")) {
    themes.add("Piece safety / hanging pieces");
  }
  if (text.includes("king")) themes.add("King safety");
  if (bad.some((a) => /O-O|castle/i.test(a.san + a.outcomeNote))) {
    themes.add("Timing of castling");
  }
  if (bad.length >= 2) themes.add("Calculation under pressure");
  if (annotations.filter((a) => a.classification === "best").length >= 5) {
    themes.add("Strong consistency on best moves");
  }
  if (themes.size === 0) themes.add("General decision quality");
  return [...themes].slice(0, 3);
}
