import type {
  CareerSave,
  CompletedFixture,
  Fixture,
  FranchiseId,
} from "../domain/models";
import { buildEngineTeam } from "../engine/teamBuilder";
import { simulateMatch } from "../engine/matchEngine";
import type { Standing } from "./standings";
import { completedFixtureFromMatch } from "./standings";
import {
  resolvePlayoffFixtures,
  seasonChampion,
} from "./playoffs";
import type { SeasonSchedule } from "./schedule";

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function fixtureSeed(seasonSeed: number, fixtureId: string): number {
  return (seasonSeed ^ hash(fixtureId)) >>> 0;
}

export function simulateFixture(
  fixture: Fixture,
  seasonSeed: number,
): CompletedFixture {
  const result = simulateMatch({
    fixtureId: fixture.id,
    seed: fixtureSeed(seasonSeed, fixture.id),
    home: buildEngineTeam(fixture.homeId),
    away: buildEngineTeam(fixture.awayId),
    userTeamId: fixture.homeId,
    tossCall: "heads",
    tossDecision: "bat",
    tactics: {
      battingIntent: "balanced",
      bowlingPlan: "balanced",
      field: "balanced",
    },
  });

  return completedFixtureFromMatch(fixture, result);
}

function simulateDecidedFixture(
  fixture: Fixture,
  seasonSeed: number,
): CompletedFixture {
  for (let attempt = 0; attempt < 128; attempt += 1) {
    const result = simulateMatch({
      fixtureId: fixture.id,
      seed: (fixtureSeed(seasonSeed, fixture.id) + attempt) >>> 0,
      home: buildEngineTeam(fixture.homeId),
      away: buildEngineTeam(fixture.awayId),
      userTeamId: fixture.homeId,
      tossCall: "heads",
      tossDecision: "bat",
      tactics: {
        battingIntent: "balanced",
        bowlingPlan: "balanced",
        field: "balanced",
      },
    });
    const completed = completedFixtureFromMatch(fixture, result);
    if (completed.homeRuns !== completed.awayRuns) return completed;
  }

  throw new Error(`Unable to resolve tied playoff fixture ${fixture.id}`);
}

export function simulatePlayoffs(
  schedule: SeasonSchedule,
  standings: Standing[],
  completedFixtures: CompletedFixture[],
  seasonSeed: number,
): { results: CompletedFixture[]; championId: FranchiseId | null } {
  const results = [...completedFixtures];
  const completedIds = new Set(results.map((fixture) => fixture.fixtureId));

  while (true) {
    const next = resolvePlayoffFixtures(schedule, standings, results).find(
      (fixture) => !completedIds.has(fixture.id),
    );
    if (!next) break;
    const result = simulateDecidedFixture(next, seasonSeed);
    results.push(result);
    completedIds.add(result.fixtureId);
  }

  return {
    results: results.filter((fixture) => !completedFixtures.some(
      (existing) => existing.fixtureId === fixture.fixtureId,
    )),
    championId: seasonChampion(schedule, standings, results),
  };
}

export function simulateUnplayedAIFixtures(
  fixtures: Fixture[],
  completedFixtures: CompletedFixture[],
  seasonSeed: number,
  userTeamId: FranchiseId,
): CompletedFixture[] {
  const completedIds = new Set(completedFixtures.map((fixture) => fixture.fixtureId));
  return fixtures
    .filter(
      (fixture) =>
        !completedIds.has(fixture.id) &&
        fixture.homeId !== userTeamId &&
        fixture.awayId !== userTeamId,
    )
    .map((fixture) => simulateFixture(fixture, seasonSeed));
}

export function advanceCareerToNextSeason(career: CareerSave): CareerSave {
  if (career.seasonState.championId === null) {
    throw new Error("The current season must have a champion before advancing");
  }

  const nextSeason = career.season + 1;
  return {
    ...career,
    season: nextSeason,
    currentDate: `${nextSeason}-03-01`,
    seasonState: {
      season: nextSeason,
      scheduleSeed: (career.seed ^ nextSeason) >>> 0,
      completedFixtures: [],
      championId: null,
    },
    seasonHistory: [
      ...career.seasonHistory,
      {
        season: career.season,
        championId: career.seasonState.championId,
      },
    ],
    auctionState: null,
  };
}
