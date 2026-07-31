import type { Fixture, FranchiseId } from "../domain/models";
import { franchises } from "../data/franchises";
import { SeededRandom } from "../engine/random";

export interface PlayoffTemplate {
  id: string;
  date: string;
  stage: "qualifier-1" | "eliminator" | "qualifier-2" | "final";
  homeSeed: string;
  awaySeed: string;
}

export interface SeasonSchedule {
  season: number;
  seed: number;
  leagueFixtures: Fixture[];
  playoffs: PlayoffTemplate[];
}

type Pairing = {
  homeId: FranchiseId;
  awayId: FranchiseId;
};

function shuffled<T>(items: T[], random: SeededRandom): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = random.integer(index + 1);
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function dateFromOffset(start: Date, offset: number): string {
  const date = new Date(start);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function generateSeasonSchedule(seed: number, season = 2027): SeasonSchedule {
  const teamIds = franchises.map((team) => team.id);
  const pairings: Pairing[] = [];

  for (let first = 0; first < teamIds.length; first += 1) {
    for (let second = first + 1; second < teamIds.length; second += 1) {
      const clockwiseDistance = second - first;
      const circularDistance = Math.min(clockwiseDistance, 10 - clockwiseDistance);
      const playsTwice =
        circularDistance === 1 ||
        circularDistance === 2 ||
        circularDistance === 5;

      if (playsTwice) {
        pairings.push(
          { homeId: teamIds[first], awayId: teamIds[second] },
          { homeId: teamIds[second], awayId: teamIds[first] },
        );
      } else {
        // The single-match graph is four-regular. Directing +3/+4 clockwise
        // gives every franchise exactly two home games in this group.
        const firstIsHome = clockwiseDistance === 3 || clockwiseDistance === 4;
        pairings.push({
          homeId: firstIsHome ? teamIds[first] : teamIds[second],
          awayId: firstIsHome ? teamIds[second] : teamIds[first],
        });
      }
    }
  }

  const random = new SeededRandom(seed);
  const orderedPairings = shuffled(pairings, random);
  const start = new Date(Date.UTC(season, 2, 20));
  const dayFixtures = new Map<number, Pairing[]>();

  const leagueFixtures = orderedPairings.map((pairing, index) => {
    let dayOffset = 0;
    while (true) {
      const today = dayFixtures.get(dayOffset) ?? [];
      const yesterday = dayFixtures.get(dayOffset - 1) ?? [];
      const tomorrow = dayFixtures.get(dayOffset + 1) ?? [];
      const teamsToday = new Set(
        today.flatMap((fixture) => [fixture.homeId, fixture.awayId]),
      );
      const teamsYesterday = new Set(
        yesterday.flatMap((fixture) => [fixture.homeId, fixture.awayId]),
      );
      const teamsTomorrow = new Set(
        tomorrow.flatMap((fixture) => [fixture.homeId, fixture.awayId]),
      );
      const hasConflict =
        teamsToday.has(pairing.homeId) ||
        teamsToday.has(pairing.awayId) ||
        teamsYesterday.has(pairing.homeId) ||
        teamsYesterday.has(pairing.awayId) ||
        teamsTomorrow.has(pairing.homeId) ||
        teamsTomorrow.has(pairing.awayId);
      if (today.length < 2 && !hasConflict) {
        dayFixtures.set(dayOffset, [...today, pairing]);
        break;
      }
      dayOffset += 1;
    }

    return {
      id: `ipl-${season}-${String(index + 1).padStart(2, "0")}`,
      season,
      homeId: pairing.homeId,
      awayId: pairing.awayId,
      date: dateFromOffset(start, dayOffset),
      stage: "league",
    } satisfies Fixture;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const lastLeagueDate = new Date(
    `${leagueFixtures.at(-1)!.date}T00:00:00.000Z`,
  );
  const playoffs: PlayoffTemplate[] = [
    {
      id: `ipl-${season}-q1`,
      date: dateFromOffset(lastLeagueDate, 2),
      stage: "qualifier-1",
      homeSeed: "1st",
      awaySeed: "2nd",
    },
    {
      id: `ipl-${season}-eliminator`,
      date: dateFromOffset(lastLeagueDate, 3),
      stage: "eliminator",
      homeSeed: "3rd",
      awaySeed: "4th",
    },
    {
      id: `ipl-${season}-q2`,
      date: dateFromOffset(lastLeagueDate, 5),
      stage: "qualifier-2",
      homeSeed: "Q1 loser",
      awaySeed: "Eliminator winner",
    },
    {
      id: `ipl-${season}-final`,
      date: dateFromOffset(lastLeagueDate, 7),
      stage: "final",
      homeSeed: "Q1 winner",
      awaySeed: "Q2 winner",
    },
  ];

  return { season, seed, leagueFixtures, playoffs };
}
