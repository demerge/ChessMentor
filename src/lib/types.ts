export type Variant = "standard" | "chess960" | "atomic" | "koth";

export type AiTier =
  | "beginner"
  | "beginnerPlus"
  | "club"
  | "expert"
  | "master"
  | "elite";

export type PlayColor = "white" | "black" | "random";

export type TutorDetail = "short" | "detailed";

export type Classification =
  | "brilliant"
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type GameResult = "1-0" | "0-1" | "1/2-1/2" | "*";

export interface MoveAnnotation {
  ply: number;
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  intentNote: string;
  outcomeNote: string;
  classification: Classification;
  evalBefore: number;
  evalAfter: number;
  bestMoveSan?: string;
  bestMoveUci?: string;
  cpLoss: number;
  /** AI transparent dialogue (attack/defense + prediction) */
  reactionText?: string;
  planText?: string;
  predictionText?: string;
  coachTip?: string;
  byAi?: boolean;
}

/** Stored AI prediction about the human's next move */
export interface StoredPrediction {
  predictedUci: string;
  predictedSan: string;
  predictionText: string;
  contingencyUci?: string;
  contingencySan?: string;
  contingencyText?: string;
  fenWhenPredicted: string;
  statedPlan: string;
}

export interface GameRecord {
  id: string;
  variant: Variant;
  aiTier: AiTier;
  playerColor: "white" | "black";
  pgn: string;
  result: GameResult;
  accuracy: { white: number; black: number };
  annotations: MoveAnnotation[];
  themes: string[];
  createdAt: string;
  endReason?: string;
}

export interface SetupConfig {
  variant: Variant;
  aiTier: AiTier;
  tutorDetail: TutorDetail;
  playAs: PlayColor;
}

export interface EngineLine {
  moveUci: string;
  moveSan?: string;
  scoreCp: number;
  depth: number;
  pv: string[];
}

export interface PositionFeatures {
  materialWhite: number;
  materialBlack: number;
  materialBalance: number;
  centerControl: number;
  whiteKingSafety: number;
  blackKingSafety: number;
  whiteMobility: number;
  blackMobility: number;
  isolatedPawns: number;
  doubledPawns: number;
  passedPawns: number;
  hangingPieces: string[];
  sideToMove: "white" | "black";
}

export const VARIANT_LABELS: Record<Variant, string> = {
  standard: "Standard",
  chess960: "Chess960",
  atomic: "Atomic",
  koth: "King of the Hill",
};

export const TIER_META: Record<
  AiTier,
  { label: string; elo: number; skill: number; limitStrength: boolean; description: string }
> = {
  beginner: {
    label: "Learning the ropes",
    elo: 800,
    skill: 2,
    limitStrength: true,
    description: "~800",
  },
  beginnerPlus: {
    label: "Casual player",
    elo: 1100,
    skill: 4,
    limitStrength: true,
    description: "1000–1200",
  },
  club: {
    label: "Club player",
    elo: 1600,
    skill: 9,
    limitStrength: true,
    description: "1400–1800",
  },
  expert: {
    label: "Tournament expert",
    elo: 2100,
    skill: 14,
    limitStrength: true,
    description: "2000–2200",
  },
  master: {
    label: "Master strength",
    elo: 2400,
    skill: 18,
    limitStrength: true,
    description: "2200–2500",
  },
  elite: {
    label: "Grandmaster",
    elo: 2800,
    skill: 20,
    limitStrength: false,
    description: "2500+",
  },
};

export const CLASSIFICATION_META: Record<
  Classification,
  { label: string; icon: string; cpMin: number; cpMax: number }
> = {
  brilliant: { label: "Brilliant", icon: "✦", cpMin: -Infinity, cpMax: -1 },
  best: { label: "Best", icon: "✓", cpMin: 0, cpMax: 10 },
  good: { label: "Good", icon: "•", cpMin: 10, cpMax: 50 },
  inaccuracy: { label: "Inaccuracy", icon: "?!", cpMin: 50, cpMax: 100 },
  mistake: { label: "Mistake", icon: "?", cpMin: 100, cpMax: 300 },
  blunder: { label: "Blunder", icon: "??", cpMin: 300, cpMax: Infinity },
};
