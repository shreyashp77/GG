import type { Tactics } from "../domain/models";
import { SeededRandom } from "./random";
import type {
  BatterScore,
  BowlerScore,
  EngineMatchEvent,
  EnginePlayer,
  EngineTeam,
  InningsResult,
  MatchSimulationInput,
  MatchSimulationResult,
} from "./types";

const wicketKinds = ["bowled", "caught", "lbw", "run out"] as const;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function chooseBowler(
  bowlingTeam: EngineTeam,
  over: number,
  oversBowled: Map<string, number>,
): EnginePlayer {
  const options = [...bowlingTeam.players]
    .filter((player) => player.bowling >= 35)
    .sort((a, b) => b.bowling - a.bowling);
  const legalOptions = options.filter((player) => (oversBowled.get(player.id) ?? 0) < 4);
  const pool = legalOptions.length ? legalOptions : options;
  return pool[over % Math.min(pool.length, 5)] ?? bowlingTeam.players[10];
}

function commentaryFor(
  batter: EnginePlayer,
  bowler: EnginePlayer,
  runsOffBat: number,
  extras: number,
  extraType: "wide" | "no-ball" | null,
  wicketKind: typeof wicketKinds[number] | null,
): string {
  if (wicketKind) {
    return `OUT! ${batter.name} is ${wicketKind} — ${bowler.name} breaks through.`;
  }
  if (extraType === "wide") return `${bowler.name} loses the line. Wide called.`;
  if (extraType === "no-ball") {
    return `No-ball from ${bowler.name}${runsOffBat ? `, and ${batter.name} adds ${runsOffBat}` : ""}. Free hit next.`;
  }
  if (runsOffBat === 6) return `${batter.name} launches it cleanly over the rope for six!`;
  if (runsOffBat === 4) return `${batter.name} finds the gap — four runs.`;
  if (runsOffBat === 3) return `Excellent running from ${batter.name}; they come back for three.`;
  if (runsOffBat === 2) return `${batter.name} works it into space for a couple.`;
  if (runsOffBat === 1) return `${batter.name} rotates the strike with a single.`;
  if (extras) return `${extras} extras added.`;
  return `${bowler.name} hits the spot. No run.`;
}

function resolveLegalOutcome(
  random: SeededRandom,
  batter: EnginePlayer,
  bowler: EnginePlayer,
  tactics: Tactics,
  phase: "powerplay" | "middle" | "death",
  freeHit: boolean,
): { runs: number; wicketKind: typeof wicketKinds[number] | null } {
  const intent = tactics.battingIntent === "attacking"
    ? 0.065
    : tactics.battingIntent === "defensive"
      ? -0.045
      : 0;
  const field = tactics.field === "attacking"
    ? 0.018
    : tactics.field === "defensive"
      ? -0.012
      : 0;
  const bowlingPlan = tactics.bowlingPlan === "wickets"
    ? 0.012
    : tactics.bowlingPlan === "contain"
      ? -0.008
      : 0;
  const phaseWicket = phase === "death" ? 0.012 : phase === "powerplay" ? 0.004 : 0;
  const skillDifference = (bowler.bowling - batter.batting) / 900;
  const wicketChance = clamp(
    0.043 + skillDifference + phaseWicket + intent * 0.23 + field + bowlingPlan,
    0.018,
    0.105,
  );

  if (!freeHit && random.next() < wicketChance) {
    return { runs: 0, wicketKind: random.pick(wicketKinds) };
  }

  const battingEdge = (batter.batting - bowler.bowling) / 700;
  const boundaryShift =
    intent +
    battingEdge +
    (phase === "death" ? 0.035 : 0) +
    (tactics.bowlingPlan === "wickets" ? 0.018 : tactics.bowlingPlan === "contain" ? -0.015 : 0);
  const roll = random.next();
  const sixCut = clamp(0.055 + boundaryShift * 0.45, 0.025, 0.16);
  const fourCut = sixCut + clamp(0.135 + boundaryShift, 0.08, 0.27);
  const threeCut = fourCut + 0.012;
  const twoCut = threeCut + 0.09;
  const oneCut = twoCut + clamp(0.37 - boundaryShift * 0.25, 0.27, 0.43);
  if (roll < sixCut) return { runs: 6, wicketKind: null };
  if (roll < fourCut) return { runs: 4, wicketKind: null };
  if (roll < threeCut) return { runs: 3, wicketKind: null };
  if (roll < twoCut) return { runs: 2, wicketKind: null };
  if (roll < oneCut) return { runs: 1, wicketKind: null };
  return { runs: 0, wicketKind: null };
}

function simulateInnings(
  inningsNumber: 1 | 2,
  battingTeam: EngineTeam,
  bowlingTeam: EngineTeam,
  target: number | null,
  random: SeededRandom,
  tactics: Tactics,
  eventOffset: number,
): { innings: InningsResult; events: EngineMatchEvent[] } {
  const batters = new Map<string, BatterScore>(
    battingTeam.players.map((player) => [
      player.id,
      {
        playerId: player.id,
        name: player.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        dismissal: null,
      },
    ]),
  );
  const bowlers = new Map<string, BowlerScore>();
  const oversBowled = new Map<string, number>();
  const events: EngineMatchEvent[] = [];
  let strikerIndex = 0;
  let nonStrikerIndex = 1;
  let nextBatterIndex = 2;
  let score = 0;
  let wickets = 0;
  let legalBalls = 0;
  let freeHit = false;

  while (legalBalls < 120 && wickets < 10 && (target === null || score < target)) {
    const over = Math.floor(legalBalls / 6);
    const legalBallInOver = legalBalls % 6;
    const bowler = chooseBowler(bowlingTeam, over, oversBowled);
    if (!bowlers.has(bowler.id)) {
      bowlers.set(bowler.id, {
        playerId: bowler.id,
        name: bowler.name,
        balls: 0,
        runs: 0,
        wickets: 0,
        wides: 0,
        noBalls: 0,
      });
    }
    const bowlerScore = bowlers.get(bowler.id)!;
    const batter = battingTeam.players[strikerIndex];
    const batterScore = batters.get(batter.id)!;
    const phase = over < 6 ? "powerplay" : over < 16 ? "middle" : "death";

    let legalBall = true;
    let extraType: "wide" | "no-ball" | null = null;
    let extras = 0;
    let runsOffBat = 0;
    let wicketKind: typeof wicketKinds[number] | null = null;
    const extraRoll = random.next();

    if (extraRoll < 0.032) {
      legalBall = false;
      extraType = "wide";
      extras = random.next() < 0.93 ? 1 : random.pick([2, 3, 5]);
      bowlerScore.wides += extras;
    } else if (extraRoll < 0.048) {
      legalBall = false;
      extraType = "no-ball";
      extras = 1;
      bowlerScore.noBalls += 1;
      const outcome = resolveLegalOutcome(random, batter, bowler, tactics, phase, true);
      runsOffBat = outcome.runs;
      freeHit = true;
    } else {
      const outcome = resolveLegalOutcome(random, batter, bowler, tactics, phase, freeHit);
      runsOffBat = outcome.runs;
      wicketKind = outcome.wicketKind;
      freeHit = false;
    }

    const totalRuns = runsOffBat + extras;
    score += totalRuns;
    bowlerScore.runs += totalRuns;
    if (legalBall) {
      legalBalls += 1;
      bowlerScore.balls += 1;
      batterScore.balls += 1;
    }
    batterScore.runs += runsOffBat;
    if (runsOffBat === 4) batterScore.fours += 1;
    if (runsOffBat === 6) batterScore.sixes += 1;

    if (wicketKind) {
      wickets += 1;
      batterScore.dismissal = wicketKind;
      if (wicketKind !== "run out") bowlerScore.wickets += 1;
    }

    const eventIndex = eventOffset + events.length;
    events.push({
      id: `${inningsNumber}-${eventIndex}`,
      index: eventIndex,
      innings: inningsNumber,
      over,
      ball: legalBallInOver + 1,
      legalBall,
      battingTeamId: battingTeam.id,
      strikerId: batter.id,
      bowlerId: bowler.id,
      runsOffBat,
      extras,
      extraType,
      wicket: wicketKind ? { playerId: batter.id, kind: wicketKind } : null,
      score,
      wickets,
      legalBalls,
      target,
      commentary: commentaryFor(
        batter,
        bowler,
        runsOffBat,
        extras,
        extraType,
        wicketKind,
      ),
      shot: runsOffBat
        ? {
            x: Math.round(50 + (random.next() - 0.5) * 86),
            y: Math.round(50 + (random.next() - 0.5) * 86),
          }
        : null,
    });

    if (wicketKind && wickets < 10) {
      strikerIndex = nextBatterIndex;
      nextBatterIndex += 1;
    } else if (totalRuns % 2 === 1) {
      [strikerIndex, nonStrikerIndex] = [nonStrikerIndex, strikerIndex];
    }

    if (legalBall && legalBalls % 6 === 0) {
      oversBowled.set(bowler.id, (oversBowled.get(bowler.id) ?? 0) + 1);
      [strikerIndex, nonStrikerIndex] = [nonStrikerIndex, strikerIndex];
    }
  }

  return {
    innings: {
      battingTeamId: battingTeam.id,
      bowlingTeamId: bowlingTeam.id,
      runs: score,
      wickets,
      legalBalls,
      batters: [...batters.values()].filter(
        (batter) => batter.balls > 0 || batter.runs > 0 || batter.dismissal,
      ),
      bowlers: [...bowlers.values()],
    },
    events,
  };
}

function aiTactics(): Tactics {
  return {
    battingIntent: "balanced",
    bowlingPlan: "balanced",
    field: "balanced",
  };
}

function inningsTactics(
  input: MatchSimulationInput,
  battingTeam: EngineTeam,
  bowlingTeam: EngineTeam,
): Tactics {
  const ai = aiTactics();
  return {
    battingIntent:
      battingTeam.id === input.userTeamId
        ? input.tactics.battingIntent
        : ai.battingIntent,
    bowlingPlan:
      bowlingTeam.id === input.userTeamId
        ? input.tactics.bowlingPlan
        : ai.bowlingPlan,
    field:
      bowlingTeam.id === input.userTeamId
        ? input.tactics.field
        : ai.field,
  };
}

export function simulateMatch(input: MatchSimulationInput): MatchSimulationResult {
  const random = new SeededRandom(input.seed);
  const coin = random.next() < 0.5 ? "heads" : "tails";
  const userTeam = input.home.id === input.userTeamId ? input.home : input.away;
  const opposition = input.home.id === input.userTeamId ? input.away : input.home;
  const tossWinner = coin === input.tossCall ? userTeam : opposition;
  const tossDecision = tossWinner.id === input.userTeamId
    ? input.tossDecision
    : random.next() < 0.64
      ? "bowl"
      : "bat";
  const firstBattingTeam = tossDecision === "bat"
    ? tossWinner
    : tossWinner.id === input.home.id
      ? input.away
      : input.home;
  const secondBattingTeam = firstBattingTeam.id === input.home.id ? input.away : input.home;

  const first = simulateInnings(
    1,
    firstBattingTeam,
    secondBattingTeam,
    null,
    random,
    inningsTactics(input, firstBattingTeam, secondBattingTeam),
    0,
  );
  const second = simulateInnings(
    2,
    secondBattingTeam,
    firstBattingTeam,
    first.innings.runs + 1,
    random,
    inningsTactics(input, secondBattingTeam, firstBattingTeam),
    first.events.length,
  );

  let winnerId = null;
  let resultText = "Match tied";
  if (second.innings.runs > first.innings.runs) {
    winnerId = secondBattingTeam.id;
    resultText = `${secondBattingTeam.name} won by ${10 - second.innings.wickets} wickets`;
  } else if (second.innings.runs < first.innings.runs) {
    winnerId = firstBattingTeam.id;
    resultText = `${firstBattingTeam.name} won by ${first.innings.runs - second.innings.runs} runs`;
  }

  return {
    fixtureId: input.fixtureId,
    seed: input.seed,
    tossWinnerId: tossWinner.id,
    tossDecision,
    firstBattingTeamId: firstBattingTeam.id,
    winnerId,
    resultText,
    innings: [first.innings, second.innings],
    events: [...first.events, ...second.events],
  };
}
