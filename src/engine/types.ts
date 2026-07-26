import type { FranchiseId, PlayerRole, Tactics } from "../domain/models";

export interface EnginePlayer {
  id: string;
  name: string;
  role: PlayerRole;
  batting: number;
  bowling: number;
  fielding: number;
}

export interface EngineTeam {
  id: FranchiseId;
  name: string;
  shortName: string;
  players: EnginePlayer[];
}

export interface MatchSimulationInput {
  fixtureId: string;
  seed: number;
  home: EngineTeam;
  away: EngineTeam;
  userTeamId: FranchiseId;
  tossCall: "heads" | "tails";
  tossDecision: "bat" | "bowl";
  tactics: Tactics;
}

export interface BatterScore {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dismissal: string | null;
}

export interface BowlerScore {
  playerId: string;
  name: string;
  balls: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
}

export interface EngineMatchEvent {
  id: string;
  index: number;
  innings: 1 | 2;
  over: number;
  ball: number;
  legalBall: boolean;
  battingTeamId: FranchiseId;
  strikerId: string;
  bowlerId: string;
  runsOffBat: number;
  extras: number;
  extraType: "wide" | "no-ball" | null;
  wicket: {
    playerId: string;
    kind: "bowled" | "caught" | "lbw" | "run out";
  } | null;
  score: number;
  wickets: number;
  legalBalls: number;
  target: number | null;
  commentary: string;
  shot: { x: number; y: number } | null;
}

export interface InningsResult {
  battingTeamId: FranchiseId;
  bowlingTeamId: FranchiseId;
  runs: number;
  wickets: number;
  legalBalls: number;
  batters: BatterScore[];
  bowlers: BowlerScore[];
}

export interface MatchSimulationResult {
  fixtureId: string;
  seed: number;
  tossWinnerId: FranchiseId;
  tossDecision: "bat" | "bowl";
  firstBattingTeamId: FranchiseId;
  winnerId: FranchiseId | null;
  resultText: string;
  innings: [InningsResult, InningsResult];
  events: EngineMatchEvent[];
}
