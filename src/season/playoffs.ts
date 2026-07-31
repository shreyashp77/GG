import type {
  CompletedFixture,
  Fixture,
  FranchiseId,
} from "../domain/models";
import type { PlayoffTemplate, SeasonSchedule } from "./schedule";
import type { Standing } from "./standings";

export type ResolvedPlayoffFixture = Fixture;

function fixtureFromTemplate(
  template: PlayoffTemplate,
  season: number,
  homeId: FranchiseId,
  awayId: FranchiseId,
): ResolvedPlayoffFixture {
  return {
    id: template.id,
    season,
    homeId,
    awayId,
    date: template.date,
    stage: template.stage,
  };
}

function resultFor(
  completedFixtures: CompletedFixture[],
  fixtureId: string,
): CompletedFixture | undefined {
  return completedFixtures.find((fixture) => fixture.fixtureId === fixtureId);
}

function winnerOf(result: CompletedFixture | undefined): FranchiseId | null {
  if (!result || result.homeRuns === result.awayRuns) return null;
  return result.homeRuns > result.awayRuns ? result.homeId : result.awayId;
}

export function playoffWinner(
  completedFixtures: CompletedFixture[],
  fixtureId: string,
): FranchiseId | null {
  return winnerOf(resultFor(completedFixtures, fixtureId));
}

export function resolvePlayoffFixtures(
  schedule: SeasonSchedule,
  standings: Standing[],
  completedFixtures: CompletedFixture[],
): ResolvedPlayoffFixture[] {
  if (standings.length < 4) return [];

  const [first, second, third, fourth] = standings.slice(0, 4).map(
    (standing) => standing.franchiseId,
  );
  const templates = schedule.playoffs;
  const resolved: ResolvedPlayoffFixture[] = [
    fixtureFromTemplate(templates[0], schedule.season, first, second),
    fixtureFromTemplate(templates[1], schedule.season, third, fourth),
  ];
  const qualifierWinner = playoffWinner(completedFixtures, templates[0].id);
  const qualifierLoser = qualifierWinner
    ? qualifierWinner === first
      ? second
      : first
    : null;
  const eliminatorWinner = playoffWinner(completedFixtures, templates[1].id);

  if (qualifierLoser && eliminatorWinner) {
    resolved.push(
      fixtureFromTemplate(
        templates[2],
        schedule.season,
        qualifierLoser,
        eliminatorWinner,
      ),
    );
  }

  const qualifierOneWinner = qualifierWinner;
  const qualifierTwoWinner = playoffWinner(completedFixtures, templates[2].id);
  if (qualifierOneWinner && qualifierTwoWinner) {
    resolved.push(
      fixtureFromTemplate(templates[3], schedule.season, qualifierOneWinner, qualifierTwoWinner),
    );
  }

  return resolved;
}

export function seasonChampion(
  schedule: SeasonSchedule,
  standings: Standing[],
  completedFixtures: CompletedFixture[],
): FranchiseId | null {
  const final = resolvePlayoffFixtures(schedule, standings, completedFixtures).find(
    (fixture) => fixture.stage === "final",
  );
  return final ? playoffWinner(completedFixtures, final.id) : null;
}
