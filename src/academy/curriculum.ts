import type { AcademyLesson, AcademyModule, ArenaChallenge } from "./types";
import { puzzlesForTag } from "./puzzles";

function tacticLesson(
  id: string,
  title: string,
  tag: string,
  definition: string,
  mistakes: string,
  masters: { name: string; note: string }[],
  difficulty: 1 | 2 | 3 | 4 | 5 = 2
): AcademyLesson {
  const pz = puzzlesForTag(tag, 2);
  const p0 = pz[0] ?? puzzlesForTag("fork", 1)[0];
  const p1 = pz[1] ?? p0;

  return {
    id,
    moduleId: "tactics",
    kind: "tactic",
    title,
    summary: definition,
    masteryLoop: ["find", "create", "prevent"],
    tags: [tag, "tactics"],
    difficulty,
    estimatedMinutes: 12,
    masters,
    steps: [
      {
        stage: "explain",
        title: `What is a ${title}?`,
        body: `${definition}\n\nCommon mistakes: ${mistakes}\n\nMastery loop: Find it → Create it → Prevent it.`,
      },
      {
        stage: "demonstrate",
        title: "Visual demonstration",
        body: `Watch the geometry of the ${title.toLowerCase()}. Key squares light up — the motif is about relationship between pieces, not memorizing a single move.`,
        fen: p0.fen,
        highlights: p0.solutionUci[0]
          ? [p0.solutionUci[0].slice(0, 2), p0.solutionUci[0].slice(2, 4)]
          : [],
        arrows: p0.solutionUci[0]
          ? [
              {
                from: p0.solutionUci[0].slice(0, 2),
                to: p0.solutionUci[0].slice(2, 4),
                color: "#3C6E47",
              },
            ]
          : [],
      },
      {
        stage: "guided",
        title: "Recognition quiz",
        body: "Identify the idea before you calculate variations.",
        quiz: {
          prompt: `Which statement best describes a ${title.toLowerCase()}?`,
          choices: [
            definition.slice(0, 90) + (definition.length > 90 ? "…" : ""),
            "Always sacrifice a queen for two pawns.",
            "Only happens in the endgame with opposite bishops.",
            "A random capture without calculation.",
          ],
          correctIndex: 0,
          explanation: definition,
        },
      },
      {
        stage: "practice",
        title: "Find it — puzzle",
        body: p0.goal,
        puzzle: {
          fen: p0.fen,
          playerColor: p0.playerColor,
          solutionUci: p0.solutionUci,
          hint: p0.hint,
          goal: p0.goal,
        },
      },
      {
        stage: "assess",
        title: "Create / prevent assessment",
        body: "Practical judgment: when would you seek this motif — and how do you stop it as the defender?",
        quiz: {
          prompt: `Best defensive mindset against a looming ${title.toLowerCase()}?`,
          choices: [
            "Ignore it and push pawns on the other wing only",
            "Spot the alignment early; break pins/lines; overprotect key units",
            "Always trade queens immediately",
            "Never develop pieces",
          ],
          correctIndex: 1,
          explanation:
            "Prevention is recognition + geometry: remove the alignment, overprotect, or step out of the fork/pin line before it lands.",
        },
      },
      {
        stage: "review",
        title: "Spaced review seed",
        body: `You'll see ${title} again based on your mastery score. Miss it in games and the academy schedules more practice automatically.`,
        puzzle: {
          fen: p1.fen,
          playerColor: p1.playerColor,
          solutionUci: p1.solutionUci,
          hint: p1.hint,
          goal: "Quick review — solve again under light pressure.",
        },
      },
    ],
  };
}

const TACTIC_DEFS: {
  id: string;
  title: string;
  tag: string;
  def: string;
  mistakes: string;
  masters: { name: string; note: string }[];
  diff?: 1 | 2 | 3 | 4 | 5;
}[] = [
  {
    id: "tac-fork",
    title: "Fork",
    tag: "fork",
    def: "One piece attacks two or more enemy units at once, forcing material gain or a crushing concession.",
    mistakes: "Forcing a fork that hangs your own piece; missing king+rook knight forks.",
    masters: [
      { name: "Tal", note: "Knight forks as the heartbeat of initiative." },
      { name: "Kasparov", note: "Central knights creating double attacks." },
    ],
  },
  {
    id: "tac-pin",
    title: "Pin",
    tag: "pin",
    def: "A piece cannot move (or moves at great cost) because it shields a more valuable unit behind it.",
    mistakes: "Assuming absolute pins when the king is not behind; ignoring cross-pins.",
    masters: [
      { name: "Capablanca", note: "Quiet pins that freeze defenders." },
      { name: "Carlsen", note: "Technical pins converting endgames." },
    ],
  },
  {
    id: "tac-skewer",
    title: "Skewer",
    tag: "skewer",
    def: "A more valuable piece is attacked and must move, exposing a less valuable unit behind it.",
    mistakes: "Confusing skewers with pins; missing rook skewers on open files.",
    masters: [{ name: "Fischer", note: "Clinical skewers in simplified positions." }],
  },
  {
    id: "tac-double-attack",
    title: "Double Attack",
    tag: "fork",
    def: "Two threats created in one move — not always by the same piece geometry as a classic fork.",
    mistakes: "Creating two weak threats instead of one decisive dual threat.",
    masters: [{ name: "Morphy", note: "Development creating multiple threats." }],
  },
  {
    id: "tac-discovered",
    title: "Discovered Attack",
    tag: "discovered_attack",
    def: "Moving one piece reveals an attack from a piece behind it along a line.",
    mistakes: "Discovering onto a defended square; missing discovered checks.",
    masters: [{ name: "Tal", note: "Discovers with check as a force multiplier." }],
    diff: 3,
  },
  {
    id: "tac-clearance",
    title: "Clearance",
    tag: "clearance",
    def: "Vacating a square or line so another piece can use it with tempo.",
    mistakes: "Clearing without tempo; leaving hanging material.",
    masters: [{ name: "Kasparov", note: "Sacrificial clearances opening lines to the king." }],
    diff: 3,
  },
  {
    id: "tac-deflection",
    title: "Deflection",
    tag: "deflection",
    def: "Luring a defender away from a critical square or duty.",
    mistakes: "Deflecting into a still-defended key square.",
    masters: [{ name: "Alekhine", note: "Deflection combinations in the middlegame." }],
    diff: 3,
  },
  {
    id: "tac-decoy",
    title: "Decoy / Attraction",
    tag: "decoy",
    def: "Forcing a piece onto a square where it becomes vulnerable to a follow-up tactic.",
    mistakes: "Decoying without a concrete second move.",
    masters: [{ name: "Magnus", note: "Quiet attractions in technical wins." }],
    diff: 3,
  },
  {
    id: "tac-overload",
    title: "Overloading",
    tag: "overloading",
    def: "A defender has too many jobs; you force it to abandon one.",
    mistakes: "Attacking the wrong duty of the overloaded piece.",
    masters: [{ name: "Botvinnik", note: "Strategic overloads of key defenders." }],
    diff: 3,
  },
  {
    id: "tac-remove-defender",
    title: "Removing the Defender",
    tag: "deflection",
    def: "Eliminate or displace the piece that holds a critical point, then take what it protected.",
    mistakes: "Removing a defender that was not actually essential.",
    masters: [{ name: "Capablanca", note: "Simplifying removals into won endgames." }],
  },
  {
    id: "tac-zwischenzug",
    title: "Zwischenzug",
    tag: "zwischenzug",
    def: "An intermediate move inserted before the expected reply, changing the evaluation.",
    mistakes: "Automatic recaptures without checking in-between checks.",
    masters: [{ name: "Tal", note: "In-between checks as art." }],
    diff: 4,
  },
  {
    id: "tac-xray",
    title: "X-Ray Attack",
    tag: "pin",
    def: "A piece exerts pressure through an enemy or friendly unit along a line.",
    mistakes: "Ignoring x-ray defenses of back-rank mates.",
    masters: [{ name: "Karpov", note: "Long-range pressure through the board." }],
    diff: 3,
  },
  {
    id: "tac-windmill",
    title: "Windmill",
    tag: "windmill",
    def: "A repeating discovered-check mechanism collecting material.",
    mistakes: "Breaking the windmill one check too early.",
    masters: [{ name: "Torre vs Lasker (theme)", note: "Classic windmill imagery." }],
    diff: 4,
  },
  {
    id: "tac-smothered",
    title: "Smothered Mate",
    tag: "smothered_mate",
    def: "A knight mates a king trapped by its own pieces.",
    mistakes: "Missing the queen sac setup (Philidor's legacy pattern).",
    masters: [{ name: "Philidor", note: "Pattern heritage of smothered mates." }],
    diff: 3,
  },
  {
    id: "tac-greek-gift",
    title: "Greek Gift",
    tag: "greek_gift",
    def: "Classic BxH7+ sacrifice ripping open the castled king when conditions hold.",
    mistakes: "Sacrificing when the knight cannot land on g5 with support.",
    masters: [{ name: "Many classical GMs", note: "Textbook attacking pattern." }],
    diff: 4,
  },
  {
    id: "tac-back-rank",
    title: "Back Rank Mate",
    tag: "back_rank",
    def: "Mate on the 8th/1st rank when the king has no luft and the rank is invaded.",
    mistakes: "Leaving your own back rank weak while hunting.",
    masters: [{ name: "Morphy", note: "Open lines to a trapped king." }],
  },
  {
    id: "tac-anastasia",
    title: "Anastasia Mate",
    tag: "mate_threat",
    def: "Knight and rook cooperate to mate a king on the edge, often after a clearance.",
    mistakes: "Misplacing the knight check square.",
    masters: [{ name: "Pattern library", note: "Named mating net." }],
    diff: 4,
  },
  {
    id: "tac-boden",
    title: "Boden Mate",
    tag: "mate_threat",
    def: "Crossing bishops mate a king cramped by its own pieces, often after a queen sac.",
    mistakes: "Forcing Boden when diagonals are blocked.",
    masters: [{ name: "Boden", note: "Historical namesake pattern." }],
    diff: 4,
  },
  {
    id: "tac-arabian",
    title: "Arabian Mate",
    tag: "mate_threat",
    def: "Knight and rook mate in the corner — rook on the seventh/edge with knight support.",
    mistakes: "Allowing the king an escape before the rook lands.",
    masters: [{ name: "Medieval manuscripts", note: "Ancient pattern still practical." }],
    diff: 3,
  },
  {
    id: "tac-opera",
    title: "Opera Mate",
    tag: "back_rank",
    def: "Rook mates on the back rank supported by a bishop cutting escape — Morphy Opera Game DNA.",
    mistakes: "Leaving the bishop diagonal closed.",
    masters: [{ name: "Morphy", note: "Opera Game immortal themes." }],
    diff: 3,
  },
  {
    id: "tac-queen-sac",
    title: "Queen Sacrifice",
    tag: "clearance",
    def: "Giving the queen for decisive attack, mate, or overwhelming compensation.",
    mistakes: "Sacrificing without forced continuation.",
    masters: [
      { name: "Tal", note: "Intuitive queen sacrifices." },
      { name: "Kasparov", note: "Calculated brilliancies." },
    ],
    diff: 5,
  },
  {
    id: "tac-exchange-sac",
    title: "Exchange Sacrifice",
    tag: "clearance",
    def: "Giving rook for minor piece to ruin structure, dominate color complex, or attack.",
    mistakes: "Exchange sacs that only yield temporary activity.",
    masters: [{ name: "Petrosian", note: "Positional exchange sacrifices." }],
    diff: 4,
  },
  {
    id: "tac-underpromo",
    title: "Underpromotion",
    tag: "zwischenzug",
    def: "Promoting to N/B/R instead of queen for tactical necessity.",
    mistakes: "Auto-queening into stalemate or fork.",
    masters: [{ name: "Study composers", note: "Underpromotion as motif art." }],
    diff: 4,
  },
  {
    id: "tac-trapped",
    title: "Trapped Piece",
    tag: "trapped",
    def: "A piece has no safe squares and will be won by force.",
    mistakes: "Trapping yourself while hunting.",
    masters: [{ name: "Fischer", note: "Hunting loose pieces with precision." }],
    diff: 2,
  },
];

function foundationLessons(): AcademyLesson[] {
  return [
    {
      id: "found-observe",
      moduleId: "foundation",
      kind: "thinking",
      title: "Observe before you move",
      summary: "Masters scan the whole board before touching a piece.",
      tags: ["foundation", "vision"],
      difficulty: 1,
      estimatedMinutes: 10,
      steps: [
        {
          stage: "explain",
          title: "The master scan",
          body: "Order of thinking:\n\n1. Observe\n2. Identify threats\n3. Find forcing moves (checks, captures, threats)\n4. Evaluate\n5. Choose candidates\n6. Calculate\n7. Play\n\nSkipping steps is how blunders are born.",
        },
        {
          stage: "demonstrate",
          title: "Board vision demo",
          body: "Before any move, mark hanging pieces and king safety. The board tells a story — read it.",
          fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
          highlights: ["e5", "f3", "e4"],
        },
        {
          stage: "guided",
          title: "Threat detection quiz",
          body: "What should you check first every turn?",
          quiz: {
            prompt: "Best first question each turn?",
            choices: [
              "What is my opponent threatening?",
              "Can I castle next move only?",
              "Which pawn can I push farthest?",
              "What would look pretty?",
            ],
            correctIndex: 0,
            explanation:
              "Threat detection first prevents one-move disasters and frames calculation.",
          },
        },
        {
          stage: "practice",
          title: "Mini-game: hanging pieces",
          body: "Capture the under-defended unit.",
          puzzle: {
            fen: puzzlesForTag("foundation_hanging", 1)[0].fen,
            playerColor: "white",
            solutionUci: puzzlesForTag("foundation_hanging", 1)[0].solutionUci,
            hint: puzzlesForTag("foundation_hanging", 1)[0].hint,
            goal: "Spot every hanging / loose unit.",
          },
        },
        {
          stage: "assess",
          title: "Candidate move habit",
          body: "Generate three ideas before calculating deeply.",
          quiz: {
            prompt: "After spotting threats, what next?",
            choices: [
              "List 2–3 candidate moves, then calculate forcing lines",
              "Move the first piece you notice",
              "Only push rook pawns",
              "Offer a draw",
            ],
            correctIndex: 0,
            explanation:
              "Candidates create a search tree; impulse moves skip evaluation.",
          },
        },
        {
          stage: "review",
          title: "Calculation order",
          body: "CCT: Checks, Captures, Threats — then quiet moves.",
          puzzle: {
            fen: puzzlesForTag("calculation", 1)[0].fen,
            playerColor: "white",
            solutionUci: puzzlesForTag("calculation", 1)[0].solutionUci,
            hint: "Forcing moves first.",
            goal: "Apply CCT in a live position.",
          },
        },
      ],
    },
    {
      id: "found-candidates",
      moduleId: "foundation",
      kind: "thinking",
      title: "Candidate moves",
      summary: "Never calculate a single move in isolation.",
      tags: ["foundation", "candidates"],
      difficulty: 1,
      estimatedMinutes: 8,
      steps: [
        {
          stage: "explain",
          title: "Why three candidates?",
          body: "One idea is a guess. Three ideas force comparison. Masters prune after listing, not before.",
        },
        {
          stage: "demonstrate",
          title: "Compare ideas",
          body: "Quiet improvement vs forcing blow vs prophylactic move — rate each.",
          fen: "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        },
        {
          stage: "guided",
          title: "Quiz",
          body: "",
          quiz: {
            prompt: "Best use of candidate moves?",
            choices: [
              "List options, then calculate the most forcing first",
              "Pick randomly among legal moves",
              "Only consider queen moves",
              "Avoid all captures",
            ],
            correctIndex: 0,
            explanation: "Force comparison; calculate with purpose.",
          },
        },
        {
          stage: "practice",
          title: "Practice position",
          body: "Find a strong candidate and play it.",
          puzzle: {
            fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
            playerColor: "black",
            solutionUci: ["g8f6"],
            hint: "Develop with purpose toward the center.",
            goal: "Choose a high-quality developing candidate.",
          },
        },
        {
          stage: "assess",
          title: "Self-check",
          body: "",
          quiz: {
            prompt: "You found one good move. What next?",
            choices: [
              "Ask if another candidate is even better before playing",
              "Play instantly",
              "Close the app",
              "Only look at your own king forever",
            ],
            correctIndex: 0,
            explanation: "Comparison is the skill; speed comes later.",
          },
        },
        {
          stage: "review",
          title: "Habit lock-in",
          body: "In your next live game, force yourself to name three candidates aloud (or in the Candidate card) before every critical move.",
        },
      ],
    },
    {
      id: "found-vision",
      moduleId: "foundation",
      kind: "thinking",
      title: "Board vision drills",
      summary: "See attacks, defenses, and weak squares at a glance.",
      tags: ["foundation", "vision"],
      difficulty: 1,
      estimatedMinutes: 10,
      steps: [
        {
          stage: "explain",
          title: "Four mini-games of vision",
          body: "• Spot every hanging piece\n• Find every defended square around the king\n• Count attackers vs defenders\n• Find weak squares (holes)\n\nVision is trainable — like ear training in music.",
        },
        {
          stage: "demonstrate",
          title: "Attackers vs defenders",
          body: "Count who hits a square before you capture on it.",
          fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
          highlights: ["f7", "c4", "f3"],
        },
        {
          stage: "guided",
          title: "Vision quiz",
          body: "",
          quiz: {
            prompt: "Before capturing on a square you should…",
            choices: [
              "Count attackers and defenders (and checks after)",
              "Always capture if the piece is higher value",
              "Never capture with knights",
              "Close your eyes and feel it",
            ],
            correctIndex: 0,
            explanation: "Arithmetic of the square prevents cheap losses.",
          },
        },
        {
          stage: "practice",
          title: "Spot the loose unit",
          body: "",
          puzzle: {
            fen: puzzlesForTag("foundation_hanging", 1)[0].fen,
            playerColor: "white",
            solutionUci: puzzlesForTag("foundation_hanging", 1)[0].solutionUci,
            hint: "Which pawn is insufficiently guarded?",
            goal: "Hanging-piece mini-game.",
          },
        },
        {
          stage: "assess",
          title: "Weak squares",
          body: "",
          quiz: {
            prompt: "A weak square is often…",
            choices: [
              "A hole your pawns can no longer guard, ideal for enemy outposts",
              "Any square on the a-file",
              "Only f2/f7 forever",
              "The square your king starts on",
            ],
            correctIndex: 0,
            explanation: "Holes invite knights and lasting pressure.",
          },
        },
        {
          stage: "review",
          title: "Use Vision overlay in play",
          body: "In live games, cycle Vision: attacked → undefended → weak squares. Make it a ritual.",
        },
      ],
    },
  ];
}

function positionalLessons(): AcademyLesson[] {
  const topics: [string, string, string][] = [
    ["pos-open-file", "Open files", "Rooks belong on open or semi-open files to invade the 7th rank."],
    ["pos-outpost", "Outposts", "A square protected by a pawn that enemy pawns cannot challenge — park a knight."],
    ["pos-weak-sq", "Weak squares", "Holes in the pawn chain become highways for enemy pieces."],
    ["pos-bad-bishop", "Bad bishops", "A bishop hemmed by its own fixed pawns is a long-term liability."],
    ["pos-good-knight", "Good knights", "Knights thrive on outposts and closed structures."],
    ["pos-minority", "Minority attack", "Fewer pawns attack a majority to create a weakness (often c6 in QGD structures)."],
    ["pos-breaks", "Pawn breaks", "Timely pawn advances open lines when your pieces are ready."],
    ["pos-backward", "Backward pawn", "A pawn that cannot advance safely becomes a fixed target."],
    ["pos-isolani", "Isolated pawn", "Dynamic strength and static weakness — know both sides."],
    ["pos-passer", "Passed pawn", "A pawn with no enemy pawns in its path — escort it."],
    ["pos-space", "Space advantage", "More territory means freer pieces and cramped opponents."],
    ["pos-activity", "Piece activity", "Active pieces beat passive material of equal value."],
  ];

  return topics.map(([id, title, def], i) => ({
    id,
    moduleId: "positional" as const,
    kind: "positional" as const,
    title,
    summary: def,
    tags: ["positional", title.toLowerCase().replace(/\s+/g, "_")],
    difficulty: (2 + (i % 3 === 0 ? 1 : 0)) as 1 | 2 | 3 | 4 | 5,
    estimatedMinutes: 10,
    masters: [
      { name: "Karpov", note: "Prophylaxis and weak-square mastery." },
      { name: "Carlsen", note: "Technical conversion of small advantages." },
    ],
    steps: [
      { stage: "explain" as const, title: title, body: `${def}\n\nDefinition → Animation (board) → Real ideas → Guided exercises → AI practice.` },
      {
        stage: "demonstrate" as const,
        title: "On the board",
        body: `Visualize ${title.toLowerCase()} as a relationship of pawns and pieces.`,
        fen: "rnbqkb1r/pp3ppp/2p1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 5",
        highlights: ["c4", "d4", "c6", "d5"],
      },
      {
        stage: "guided" as const,
        title: "Concept check",
        body: "",
        quiz: {
          prompt: `Core idea of ${title}?`,
          choices: [def, "Always sacrifice a rook on move 5", "Never use rooks", "Ignore pawn structure"],
          correctIndex: 0,
          explanation: def,
        },
      },
      {
        stage: "practice" as const,
        title: "Guided exercise",
        body: "Play the most principled improving move in a structure-focused position.",
        puzzle: {
          fen: "rnbqkb1r/pp3ppp/2p1pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 5",
          playerColor: "white",
          solutionUci: ["e2e3"],
          hint: "Solidify the center and prepare development.",
          goal: "Choose a positional improving move.",
        },
      },
      {
        stage: "assess" as const,
        title: "Planning",
        body: "",
        quiz: {
          prompt: "When you hold a positional trumps, you should…",
          choices: [
            "Improve worst piece, fix enemy weaknesses, avoid unnecessary tactics",
            "Randomly open the position always",
            "Trade all pieces immediately without reason",
            "Ignore king safety forever",
          ],
          correctIndex: 0,
          explanation: "Positional play is patient improvement with a clear target.",
        },
      },
      {
        stage: "review" as const,
        title: "Into live games",
        body: `In your next game, name whether ${title.toLowerCase()} appears. The adaptive engine will serve more of this theme if you miss it.`,
      },
    ],
  }));
}

function openingLessons(): AcademyLesson[] {
  const openings: [string, string, string, string][] = [
    ["op-italian", "Italian Game", "e4 e5 Nf3 Nc6 Bc4", "Rapid development, pressure on f7, classical center."],
    ["op-ruy", "Ruy Lopez", "e4 e5 Nf3 Nc6 Bb5", "Pressure on the e5-pawn, long maneuvering plans."],
    ["op-sicilian", "Sicilian Defence", "e4 c5", "Asymmetric counterplay; rich tactical and strategic trees."],
    ["op-french", "French Defence", "e4 e6", "Solid chains, breaks with c5/f6, light-square battles."],
    ["op-caro", "Caro-Kann", "e4 c6", "Solid structure, reliable development, endgame leanings."],
    ["op-london", "London System", "d4 + Bf4 setup", "System opening — schemes over memorization."],
    ["op-qg", "Queen's Gambit", "d4 d5 c4", "Central tension, minority attacks, isolani structures."],
    ["op-kid", "King's Indian", "d4 Nf6 c4 g6", "Hypermodern: concede center, strike later."],
    ["op-nimzo", "Nimzo-Indian", "d4 Nf6 c4 e6 Nc3 Bb4", "Pins, structure damage, control of e4."],
    ["op-english", "English Opening", "c4", "Flexible flank control, many transpositions."],
    ["op-scotch", "Scotch Game", "e4 e5 Nf3 Nc6 d4", "Open center early, piece activity."],
  ];

  return openings.map(([id, title, moves, ideas]) => ({
    id,
    moduleId: "openings" as const,
    kind: "opening" as const,
    title,
    summary: ideas,
    tags: ["opening", title.toLowerCase().replace(/\s+/g, "_")],
    difficulty: 2 as const,
    estimatedMinutes: 15,
    masters: [
      { name: "Kasparov", note: "Deep opening preparation culture." },
      { name: "Carlsen", note: "Practical opening choices." },
    ],
    steps: [
      {
        stage: "explain" as const,
        title: `${title} — history & ideas`,
        body: `Moves: ${moves}\n\nMain ideas: ${ideas}\n\nPhilosophy: control center, develop rapidly, king safety, tempo, initiative.\n\nYou'll cover: typical plans, traps, endgames, and GM model games — then practice vs AI.`,
      },
      {
        stage: "demonstrate" as const,
        title: "Typical structure",
        body: "Feel the pawn skeleton and piece placement.",
        fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
      },
      {
        stage: "guided" as const,
        title: "Opening principles",
        body: "",
        quiz: {
          prompt: "In the opening you should prioritize…",
          choices: [
            "Center, development, king safety — avoid early queen wanderings",
            "Only hunt pawns with the queen",
            "Never castle",
            "Move the same piece five times",
          ],
          correctIndex: 0,
          explanation: "Principles beat memorization when theory ends.",
        },
      },
      {
        stage: "practice" as const,
        title: "Play a book move",
        body: "Choose a principled developing move.",
        puzzle: {
          fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
          playerColor: "white",
          solutionUci: ["f1c4"],
          hint: "Develop a piece toward the center / f7 (Italian path).",
          goal: "Italian-style development.",
        },
      },
      {
        stage: "assess" as const,
        title: "Trap awareness",
        body: "",
        quiz: {
          prompt: "Best way to handle opening traps?",
          choices: [
            "Know the idea behind your setup; verify tactics before grabbing bait",
            "Always take every free pawn",
            "Copy opponent moves forever",
            "Skip development",
          ],
          correctIndex: 0,
          explanation: "Traps punish greed and delayed development.",
        },
      },
      {
        stage: "review" as const,
        title: "Practice vs AI",
        body: `Launch a live game aiming for ${title} structures. The Opening Explorer card will coach while you're in book.`,
      },
    ],
  }));
}

function middlegameLessons(): AcademyLesson[] {
  return [
    {
      id: "mid-plan",
      moduleId: "middlegame",
      kind: "middlegame",
      title: "What is your plan?",
      summary: "Attack, defend, improve, or exchange — choose deliberately.",
      tags: ["middlegame", "planning"],
      difficulty: 3,
      estimatedMinutes: 12,
      steps: [
        {
          stage: "explain",
          title: "Planning menu",
          body: "Every middlegame decision is one of:\n\nA Attack\nB Defend\nC Improve worst piece\nD Exchange\n\nMasters name the plan before the move.",
        },
        {
          stage: "demonstrate",
          title: "Improve the worst piece",
          body: "Often the strongest 'attack' is activating a passive rook or knight.",
          fen: "r2q1rk1/ppp2ppp/2n1bn2/3p4/3P4/2N1PN2/PP2BPPP/R2Q1RK1 w - - 0 1",
        },
        {
          stage: "guided",
          title: "Pick a plan",
          body: "",
          quiz: {
            prompt: "Your pieces are undeveloped but king is safe. Best plan type?",
            choices: ["C Improve piece / complete development", "A All-out king attack only", "D Trade queens immediately always", "B Panic defend forever"],
            correctIndex: 0,
            explanation: "Finish development before romantic attacks.",
          },
        },
        {
          stage: "practice",
          title: "Improve a piece",
          body: "Find a constructive improving move.",
          puzzle: {
            fen: "r2q1rk1/ppp2ppp/2n1bn2/3p4/3P4/2N1PN2/PP2BPPP/R2Q1RK1 w - - 0 1",
            playerColor: "white",
            solutionUci: ["f1e1"],
            hint: "Centralize a rook.",
            goal: "Improve the worst/passive piece.",
          },
        },
        {
          stage: "assess",
          title: "Initiative",
          body: "",
          quiz: {
            prompt: "Initiative means…",
            choices: [
              "You are the one creating threats; opponent reacts",
              "You have more pawns only",
              "You are to move in blitz only",
              "You already checkmated",
            ],
            correctIndex: 0,
            explanation: "Keep asking questions with threats.",
          },
        },
        {
          stage: "review",
          title: "In-game coach prompt",
          body: "In live play the coach will ask: Attack / Defend / Improve / Exchange? Answer honestly before you move.",
        },
      ],
    },
    {
      id: "mid-king-attack",
      moduleId: "middlegame",
      kind: "middlegame",
      title: "Attacking the king",
      summary: "Open lines, bring pieces, don't check without purpose.",
      tags: ["middlegame", "attack"],
      difficulty: 3,
      estimatedMinutes: 12,
      steps: [
        {
          stage: "explain",
          title: "King hunt principles",
          body: "Open lines, eliminate defenders, use all pieces, calculate forcing moves. A lone queen rarely mates.",
        },
        {
          stage: "demonstrate",
          title: "Pieces toward the king",
          body: "Point every piece at the castled position before the sacrifice.",
          fen: "r1bq1rk1/ppp2ppp/2n2n2/2bpp3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1",
        },
        {
          stage: "guided",
          title: "Quiz",
          body: "",
          quiz: {
            prompt: "Before a kingside sacrifice ensure…",
            choices: [
              "Enough attackers vs defenders and a follow-up",
              "You are material up only",
              "Random hope",
              "That you never calculated",
            ],
            correctIndex: 0,
            explanation: "Arithmetic of the attack.",
          },
        },
        {
          stage: "practice",
          title: "Strike f7/h7 complex",
          body: "",
          puzzle: {
            fen: puzzlesForTag("calculation", 1)[0].fen,
            playerColor: "white",
            solutionUci: puzzlesForTag("calculation", 1)[0].solutionUci,
            hint: "Forcing move against the king sector.",
            goal: "Execute a concrete attacking blow.",
          },
        },
        {
          stage: "assess",
          title: "Counterplay",
          body: "",
          quiz: {
            prompt: "When attacking, still watch…",
            choices: [
              "Counter-checks and back-rank issues",
              "Only your own attack",
              "The clock alone",
              "Nothing",
            ],
            correctIndex: 0,
            explanation: "The best attacks leave the opponent without counterplay.",
          },
        },
        {
          stage: "review",
          title: "Transfer to games",
          body: "Tag attacks in your post-game report: did you bring enough pieces?",
        },
      ],
    },
  ];
}

function endgameLessons(): AcademyLesson[] {
  return [
    {
      id: "eg-opposition",
      moduleId: "endgame",
      kind: "endgame",
      title: "Opposition",
      summary: "Kings face off; the side not to move often yields ground.",
      tags: ["endgame", "opposition"],
      difficulty: 2,
      estimatedMinutes: 10,
      steps: [
        {
          stage: "explain",
          title: "Opposition",
          body: "When kings face with one square between them on a file/rank/diagonal, the player who does not have to move holds the opposition.",
        },
        {
          stage: "demonstrate",
          title: "Take the opposition",
          body: "Step in front of the enemy king.",
          fen: "8/8/4k3/8/4K3/8/8/8 w - - 0 1",
          highlights: ["e4", "e6", "e5"],
          arrows: [{ from: "e4", to: "e5", color: "#3C6E47" }],
        },
        {
          stage: "guided",
          title: "Quiz",
          body: "",
          quiz: {
            prompt: "You have the opposition when…",
            choices: [
              "Kings face with one square between and it is the opponent's turn",
              "You have more pawns",
              "You always move first",
              "Queens are on the board",
            ],
            correctIndex: 0,
            explanation: "Tempo against the enemy king.",
          },
        },
        {
          stage: "practice",
          title: "Move trainer",
          body: "",
          puzzle: {
            fen: puzzlesForTag("endgame_opposition", 1)[0].fen,
            playerColor: "white",
            solutionUci: puzzlesForTag("endgame_opposition", 1)[0].solutionUci,
            hint: "Close the gap correctly.",
            goal: "Seize opposition.",
          },
        },
        {
          stage: "assess",
          title: "Speed concept",
          body: "",
          quiz: {
            prompt: "Opposition is most critical in…",
            choices: [
              "King and pawn endings",
              "Opening traps only",
              "Always irrelevant",
              "Only blitz",
            ],
            correctIndex: 0,
            explanation: "Key squares and promotion races.",
          },
        },
        {
          stage: "review",
          title: "Drill again later",
          body: "Spaced review will return bare-king drills until mastery ≥ 80%.",
        },
      ],
    },
    {
      id: "eg-lucena",
      moduleId: "endgame",
      kind: "endgame",
      title: "Lucena position",
      summary: "Build a bridge with the rook to promote.",
      tags: ["endgame", "lucena", "rook"],
      difficulty: 4,
      estimatedMinutes: 15,
      steps: [
        {
          stage: "explain",
          title: "Build a bridge",
          body: "Lucena: winning rook endgame method — shield checks by building a rook bridge, then promote.",
        },
        {
          stage: "demonstrate",
          title: "King out first",
          body: "King leaves the promotion square path.",
          fen: "1K6/1P6/8/8/8/8/6r1/1k6 w - - 0 1",
        },
        {
          stage: "guided",
          title: "Quiz",
          body: "",
          quiz: {
            prompt: "Essential Lucena idea?",
            choices: [
              "Build a bridge to stop checks, then promote",
              "Sacrifice the rook immediately always",
              "Never move the king",
              "Stalemate on purpose",
            ],
            correctIndex: 0,
            explanation: "Bridge = interference against checks.",
          },
        },
        {
          stage: "practice",
          title: "First step",
          body: "",
          puzzle: {
            fen: puzzlesForTag("lucena", 1)[0].fen,
            playerColor: "white",
            solutionUci: puzzlesForTag("lucena", 1)[0].solutionUci,
            hint: "King activity.",
            goal: "Start Lucena technique.",
          },
        },
        {
          stage: "assess",
          title: "Philidor contrast",
          body: "",
          quiz: {
            prompt: "Philidor is typically the…",
            choices: [
              "Drawing method for the defender in rook endings",
              "Same as Lucena",
              "Only for bishops",
              "Opening system",
            ],
            correctIndex: 0,
            explanation: "Know both sides of rook endings.",
          },
        },
        {
          stage: "review",
          title: "AI practice",
          body: "Play out rook endings in the Lab and Challenge Arena speed drills.",
        },
      ],
    },
    {
      id: "eg-philidor",
      moduleId: "endgame",
      kind: "endgame",
      title: "Philidor defence (rook endings)",
      summary: "Draw with active rook checks from the rear.",
      tags: ["endgame", "philidor", "rook"],
      difficulty: 3,
      estimatedMinutes: 12,
      steps: [
        {
          stage: "explain",
          title: "Hold the draw",
          body: "Philidor: keep the rook on the 6th (3rd) rank to cut the king, then check from behind when the pawn advances.",
        },
        {
          stage: "demonstrate",
          title: "Cut the king",
          body: "The 6th-rank cut is the heart of the defence.",
          fen: "8/8/8/3k4/3P4/3K4/8/4R3 w - - 0 1",
        },
        {
          stage: "guided",
          title: "Quiz",
          body: "",
          quiz: {
            prompt: "When the pawn reaches the 6th, the defender should…",
            choices: [
              "Start checking the king from the rear with the rook",
              "Trade rooks always",
              "Give up the rook for the pawn immediately always",
              "Move the king to the corner randomly",
            ],
            correctIndex: 0,
            explanation: "Rear checks prevent the king from sheltering.",
          },
        },
        {
          stage: "practice",
          title: "Active rook",
          body: "Play a checking idea when available.",
          puzzle: {
            fen: "8/8/8/3k4/3P4/3K4/8/4R3 w - - 0 1",
            playerColor: "white",
            solutionUci: ["e1e5"],
            hint: "Cut or check with tempo.",
            goal: "Activate the rook correctly.",
          },
        },
        {
          stage: "assess",
          title: "Mindset",
          body: "",
          quiz: {
            prompt: "Rook endings require…",
            choices: [
              "Activity over passive defence whenever possible",
              "Always passive pieces",
              "No calculation",
              "Queens only",
            ],
            correctIndex: 0,
            explanation: "Active rook is the soul of rook endings.",
          },
        },
        {
          stage: "review",
          title: "Drill schedule",
          body: "Spaced repetition will alternate Lucena (win) and Philidor (draw).",
        },
      ],
    },
  ];
}

function psychologyLessons(): AcademyLesson[] {
  return [
    {
      id: "psy-time",
      moduleId: "psychology",
      kind: "psychology",
      title: "Time pressure",
      summary: "Think on their time; use a move ritual under 30s.",
      tags: ["psychology", "time"],
      difficulty: 2,
      estimatedMinutes: 8,
      steps: [
        {
          stage: "explain",
          title: "Clock craft",
          body: "• Think while opponent thinks\n• 10-second checklist in zeitnot: checks, captures, hanging\n• Don't blitz obvious recaptures without a scan\n• Save 1–2 minutes for conversion",
        },
        {
          stage: "demonstrate",
          title: "Ritual",
          body: "CCT in 10 seconds beats random panic moves.",
          fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5",
        },
        {
          stage: "guided",
          title: "Quiz",
          body: "",
          quiz: {
            prompt: "Under 30 seconds you should still…",
            choices: [
              "Scan checks, captures, hanging pieces",
              "Move instantly always",
              "Resign always",
              "Ignore the opponent threat",
            ],
            correctIndex: 0,
            explanation: "A short ritual prevents one-move blunders.",
          },
        },
        {
          stage: "practice",
          title: "Speed-aware solve",
          body: "Solve quickly but with CCT.",
          puzzle: {
            fen: puzzlesForTag("foundation_hanging", 1)[0].fen,
            playerColor: "white",
            solutionUci: puzzlesForTag("foundation_hanging", 1)[0].solutionUci,
            hint: "Fast scan: what hangs?",
            goal: "Accuracy under light time pressure.",
          },
        },
        {
          stage: "assess",
          title: "Tilt control",
          body: "",
          quiz: {
            prompt: "After a blunder you should…",
            choices: [
              "Breathe, reassess the new position, play the best move now",
              "Move instantly to 'punish yourself'",
              "Stop looking at threats",
              "Always resign",
            ],
            correctIndex: 0,
            explanation: "The next move is a new problem.",
          },
        },
        {
          stage: "review",
          title: "In-app think-time coach",
          body: "ChessMentor already flags instant blunders vs long thinks — use those notes.",
        },
      ],
    },
    {
      id: "psy-practical",
      moduleId: "psychology",
      kind: "psychology",
      title: "Practical chances",
      summary: "Create problems even in worse positions.",
      tags: ["psychology", "practical"],
      difficulty: 3,
      estimatedMinutes: 8,
      steps: [
        {
          stage: "explain",
          title: "Resourcefulness",
          body: "• Provoke mistakes with active defence\n• Practical sacrifices that are hard to face\n• Complicate when losing; simplify when winning\n• Avoid tilt spirals",
        },
        {
          stage: "demonstrate",
          title: "Active defence",
          body: "Counter-threats beat passive waiting.",
          fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        },
        {
          stage: "guided",
          title: "Quiz",
          body: "",
          quiz: {
            prompt: "When clearly worse but not lost…",
            choices: [
              "Create practical problems; force the opponent to be precise",
              "Give up all pieces",
              "Play random legal moves only",
              "Stop calculating",
            ],
            correctIndex: 0,
            explanation: "Swindles start with active ideas.",
          },
        },
        {
          stage: "practice",
          title: "Find a resource",
          body: "",
          puzzle: {
            fen: puzzlesForTag("fork", 1)[0].fen,
            playerColor: "white",
            solutionUci: puzzlesForTag("fork", 1)[0].solutionUci,
            hint: "Tactical resource.",
            goal: "Find a practical tactical chance.",
          },
        },
        {
          stage: "assess",
          title: "Conversion",
          body: "",
          quiz: {
            prompt: "When winning you should…",
            choices: [
              "Avoid unnecessary complications; reduce counterplay",
              "Sacrifice everything for style always",
              "Ignore king safety",
              "Never trade",
            ],
            correctIndex: 0,
            explanation: "Technique over aesthetics when converting.",
          },
        },
        {
          stage: "review",
          title: "Mindset badge",
          body: "Track 'comeback saves' in your weekly report.",
        },
      ],
    },
  ];
}

export const MODULES: AcademyModule[] = [
  {
    id: "foundation",
    title: "Foundation",
    subtitle: "How masters think",
    description:
      "Observe → threats → forcing moves → evaluate → candidates → calculate → play.",
    icon: "◈",
    order: 1,
    lessonIds: ["found-observe", "found-candidates", "found-vision"],
  },
  {
    id: "tactics",
    title: "Tactical Weapons",
    subtitle: "Every trick as a mini-course",
    description:
      "Fork through mate patterns — each with Find → Create → Prevent.",
    icon: "⚔",
    order: 2,
    lessonIds: TACTIC_DEFS.map((t) => t.id),
  },
  {
    id: "positional",
    title: "Positional Play",
    subtitle: "Strategic weapons",
    description: "Files, outposts, structures, activity — long-term advantages.",
    icon: "▣",
    order: 3,
    lessonIds: positionalLessons().map((l) => l.id),
  },
  {
    id: "openings",
    title: "Opening Weapons",
    subtitle: "Ideas over memorization",
    description: "Italian to English — plans, traps, model structures.",
    icon: "♖",
    order: 4,
    lessonIds: openingLessons().map((l) => l.id),
  },
  {
    id: "middlegame",
    title: "Middlegame Warfare",
    subtitle: "Planning under fire",
    description: "Attack, defence, improvement, exchanges, king hunts.",
    icon: "♞",
    order: 5,
    lessonIds: middlegameLessons().map((l) => l.id),
  },
  {
    id: "endgame",
    title: "Endgame Mastery",
    subtitle: "Technique wins games",
    description: "Opposition, Lucena, Philidor, piece endings.",
    icon: "♔",
    order: 6,
    lessonIds: endgameLessons().map((l) => l.id),
  },
  {
    id: "psychology",
    title: "Psychological Tricks",
    subtitle: "Practical strength",
    description: "Time, tilt, swindles, conversion mindset.",
    icon: "◎",
    order: 7,
    lessonIds: psychologyLessons().map((l) => l.id),
  },
  {
    id: "patterns",
    title: "Pattern Library",
    subtitle: "Searchable recognition",
    description: "Encyclopedia of motifs with mastery % and reviews.",
    icon: "▦",
    order: 8,
    lessonIds: [],
  },
  {
    id: "lab",
    title: "Interactive Laboratory",
    subtitle: "Sandbox",
    description: "Free board — show tactics, generate positions, ask AI.",
    icon: "⚗",
    order: 9,
    lessonIds: [],
  },
  {
    id: "arena",
    title: "Challenge Arena",
    subtitle: "Daily · Weekly · Monthly",
    description: "Focused missions that convert knowledge into skill.",
    icon: "▲",
    order: 10,
    lessonIds: [],
  },
  {
    id: "certification",
    title: "Certification",
    subtitle: "Beginner → Grandmaster path",
    description: "Ranks unlock AI personalities, scenarios, and badges.",
    icon: "★",
    order: 11,
    lessonIds: [],
  },
];

export const LESSONS: AcademyLesson[] = [
  ...foundationLessons(),
  ...TACTIC_DEFS.map((t) =>
    tacticLesson(
      t.id,
      t.title,
      t.tag,
      t.def,
      t.mistakes,
      t.masters,
      t.diff ?? 2
    )
  ),
  ...positionalLessons(),
  ...openingLessons(),
  ...middlegameLessons(),
  ...endgameLessons(),
  ...psychologyLessons(),
];

export const LESSON_BY_ID: Record<string, AcademyLesson> = Object.fromEntries(
  LESSONS.map((l) => [l.id, l])
);

export const LESSON_TAGS: Record<string, string[]> = Object.fromEntries(
  LESSONS.map((l) => [l.id, l.tags])
);

export function moduleById(id: string): AcademyModule | undefined {
  return MODULES.find((m) => m.id === id);
}

export function lessonsForModule(moduleId: string): AcademyLesson[] {
  return LESSONS.filter((l) => l.moduleId === moduleId);
}

export const ARENA_CHALLENGES: ArenaChallenge[] = [
  {
    id: "daily-forks",
    title: "Solve 5 fork patterns",
    description: "Recognition under light pressure.",
    period: "daily",
    goalType: "puzzles",
    target: 5,
    rewardXp: 80,
    lessonTag: "fork",
    puzzles: puzzlesForTag("fork", 3).map((p) => ({
      fen: p.fen,
      playerColor: p.playerColor,
      solutionUci: p.solutionUci,
      hint: p.hint,
      goal: p.goal,
    })),
  },
  {
    id: "daily-pins",
    title: "Recognize 5 pins",
    description: "See the frozen piece before it costs material.",
    period: "daily",
    goalType: "recognize",
    target: 5,
    rewardXp: 80,
    lessonTag: "pin",
  },
  {
    id: "weekly-discovered",
    title: "Win using discovered attack ideas",
    description: "Create or convert a discovery this week in practice.",
    period: "weekly",
    goalType: "win_motif",
    target: 3,
    rewardXp: 200,
    lessonTag: "discovered_attack",
  },
  {
    id: "weekly-rook",
    title: "Convert rook ending basics",
    description: "Lucena / Philidor drills.",
    period: "weekly",
    goalType: "endgame",
    target: 4,
    rewardXp: 220,
    lessonTag: "lucena",
  },
  {
    id: "monthly-mate",
    title: "Mate patterns mastery",
    description: "Back rank, smothered, and named mates.",
    period: "monthly",
    goalType: "mate",
    target: 12,
    rewardXp: 500,
    lessonTag: "back_rank",
  },
];
