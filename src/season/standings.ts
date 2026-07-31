import type {
  CompletedFixture,
  FranchiseId,
  Fixture,
} from "../domain/models";
import { franchises } from "../data/franchises";
import type { MatchSimulationResult } from "../engine/types";

export type { CompletedFixture } from "../domain/models";

export interface Standing {
  franchiseId: FranchiseId;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  netRunRate: number;
}

export function completedFixtureFromMatch(
  fixture: Fixture,
  result: MatchSimulationResult,
): CompletedFixture {
  const homeInnings = result.innings.find(
    (innings) => innings.battingTeamId === fixture.homeId,
  );
  const awayInnings = result.innings.find(
    (innings) => innings.battingTeamId === fixture.awayId,
  );

  if (!homeInnings || !awayInnings) {
    throw new Error("Match result does not contain both fixture teams");
  }

  return {
    fixtureId: fixture.id,
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    homeRuns: homeInnings.runs,
    homeBalls: homeInnings.legalBalls,
    awayRuns: awayInnings.runs,
    awayBalls: awayInnings.legalBalls,
  };
}

export function calculateStandings(results: CompletedFixture[]): Standing[] {
  const rows = new Map<FranchiseId, Standing & {
    runsFor: number;
    ballsFaced: number;
    runsAgainst: number;
    ballsBowled: number;
  }>(
    franchises.map((team) => [
      team.id,
      {
        franchiseId: team.id,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        points: 0,
        netRunRate: 0,
        runsFor: 0,
        ballsFaced: 0,
        runsAgainst: 0,
        ballsBowled: 0,
      },
    ]),
  );

  for (const result of results) {
    const home = rows.get(result.homeId)!;
    const away = rows.get(result.awayId)!;
    home.played += 1;
    away.played += 1;
    home.runsFor += result.homeRuns;
    home.ballsFaced += result.homeBalls;
    home.runsAgainst += result.awayRuns;
    home.ballsBowled += result.awayBalls;
    away.runsFor += result.awayRuns;
    away.ballsFaced += result.awayBalls;
    away.runsAgainst += result.homeRuns;
    away.ballsBowled += result.homeBalls;

    if (result.homeRuns > result.awayRuns) {
      home.won += 1;
      home.points += 2;
      away.lost += 1;
    } else if (result.awayRuns > result.homeRuns) {
      away.won += 1;
      away.points += 2;
      home.lost += 1;
    } else {
      home.tied += 1;
      away.tied += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return [...rows.values()]
    .map((row) => ({
      franchiseId: row.franchiseId,
      played: row.played,
      won: row.won,
      lost: row.lost,
      tied: row.tied,
      points: row.points,
      netRunRate:
        row.ballsFaced && row.ballsBowled
          ? (row.runsFor * 6) / row.ballsFaced -
            (row.runsAgainst * 6) / row.ballsBowled
          : 0,
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.netRunRate - a.netRunRate ||
        a.franchiseId.localeCompare(b.franchiseId),
    );
}
