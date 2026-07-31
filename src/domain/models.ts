export const DATABASE_VERSION = "ipl-2026.1";
export const RULESET_VERSION = "ipl-2027-frozen.1";
export const SAVE_SCHEMA_VERSION = 4;

export type FranchiseId =
  | "csk" | "dc" | "gt" | "kkr" | "lsg"
  | "mi" | "pbks" | "rr" | "rcb" | "srh";

export type PlayerRole =
  | "batter"
  | "wicketkeeper"
  | "all-rounder"
  | "bowler"
  | "unknown";

export interface PlayerRatings {
  batting: {
    control: number;
    power: number;
    rotation: number;
    pace: number;
    spin: number;
  };
  bowling: {
    accuracy: number;
    economy: number;
    threat: number;
    variation: number;
  };
  fielding: number;
  wicketkeeping: number;
  leadership: number;
  fitness: number;
  form: number;
  potential: number;
}

export interface Player {
  id: string;
  name: string;
  nationality: string;
  dateOfBirth: string | null;
  role: PlayerRole;
  battingHand: "right" | "left" | "unknown";
  bowlingStyle: string;
  overseas: boolean;
  fictional: boolean;
  franchiseId: FranchiseId;
  salaryLakhs: number;
  metadataQuality: "verified" | "fallback";
  ratings: PlayerRatings;
}

export interface Franchise {
  id: FranchiseId;
  name: string;
  shortName: string;
  city: string;
  venue: string;
  primary: string;
  accent: string;
  expectation: "Title challenge" | "Reach playoffs" | "Develop squad";
}

export interface Contract {
  playerId: string;
  franchiseId: FranchiseId;
  salaryLakhs: number;
  season: number;
}

export interface CareerSave {
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  databaseVersion: typeof DATABASE_VERSION;
  rulesetVersion: typeof RULESET_VERSION;
  id: string;
  coachName: string;
  franchiseId: FranchiseId;
  season: number;
  currentDate: string;
  seed: number;
  createdAt: string;
  seasonState: SeasonState;
  seasonHistory: SeasonSummary[];
}

export interface SeasonSummary {
  season: number;
  championId: FranchiseId;
}

export interface CompletedFixture {
  fixtureId: string;
  homeId: FranchiseId;
  awayId: FranchiseId;
  homeRuns: number;
  homeBalls: number;
  awayRuns: number;
  awayBalls: number;
}

export interface SeasonState {
  season: number;
  scheduleSeed: number;
  completedFixtures: CompletedFixture[];
  championId: FranchiseId | null;
}

export interface DatabasePack {
  version: typeof DATABASE_VERSION;
  generatedAt: string;
  source: string;
  franchises: Franchise[];
  players: Player[];
  contracts: Contract[];
}

export interface Season {
  year: number;
  fixtureIds: string[];
  championId: FranchiseId | null;
}

export interface Fixture {
  id: string;
  season: number;
  homeId: FranchiseId;
  awayId: FranchiseId;
  date: string;
  stage: "league" | "qualifier-1" | "eliminator" | "qualifier-2" | "final";
}

export interface AuctionState {
  season: number;
  currentPlayerId: string | null;
  highBidLakhs: number;
  highBidderId: FranchiseId | null;
  status: "not-started" | "bidding" | "sold" | "unsold" | "complete";
}

export interface Tactics {
  battingIntent: "defensive" | "balanced" | "attacking";
  bowlingPlan: "contain" | "balanced" | "wickets";
  field: "defensive" | "balanced" | "attacking";
}

export interface MatchEvent {
  id: string;
  innings: 1 | 2;
  over: number;
  ball: number;
  type: "delivery" | "wicket" | "over-end" | "innings-end" | "match-end";
  runs: number;
  commentary: string;
}

export interface MatchState {
  fixtureId: string;
  seed: number;
  innings: 1 | 2;
  score: number;
  wickets: number;
  legalBalls: number;
  events: MatchEvent[];
}
