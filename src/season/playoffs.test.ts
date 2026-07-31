import { describe, expect, it } from "vitest";
import type { CompletedFixture } from "../domain/models";
import { generateSeasonSchedule } from "./schedule";
import { resolvePlayoffFixtures, seasonChampion } from "./playoffs";
import type { Standing } from "./standings";
import { simulatePlayoffs } from "./seasonEngine";

const standings: Standing[] = [
  "mi", "csk", "rcb", "srh", "gt", "kkr", "dc", "rr", "pbks", "lsg",
].map((franchiseId, index) => ({
  franchiseId: franchiseId as Standing["franchiseId"],
  played: 14,
  won: 14 - index,
  lost: index,
  tied: 0,
  points: (14 - index) * 2,
  netRunRate: 1 - index / 100,
}));

function result(
  fixtureId: string,
  homeId: Standing["franchiseId"],
  awayId: Standing["franchiseId"],
  homeRuns: number,
  awayRuns: number,
): CompletedFixture {
  return {
    fixtureId,
    homeId,
    awayId,
    homeRuns,
    homeBalls: 120,
    awayRuns,
    awayBalls: 120,
  };
}

describe("IPL playoff bracket", () => {
  it("resolves qualifier and eliminator winners into the final", () => {
    const schedule = generateSeasonSchedule(2027);
    const [qualifier, eliminator, qualifierTwo, final] = schedule.playoffs;
    const completed = [
      result(qualifier.id, "mi", "csk", 180, 160),
      result(eliminator.id, "rcb", "srh", 175, 150),
      result(qualifierTwo.id, "csk", "rcb", 170, 165),
    ];

    const resolved = resolvePlayoffFixtures(schedule, standings, completed);
    const finalFixture = resolved.find((fixture) => fixture.id === final.id)!;

    expect(finalFixture.homeId).toBe("mi");
    expect(finalFixture.awayId).toBe("csk");
  });

  it("simulates all four playoff matches and records a champion", () => {
    const schedule = generateSeasonSchedule(2027);
    const series = simulatePlayoffs(schedule, standings, [], 2027);

    expect(series.results).toHaveLength(4);
    expect(series.results.map((fixture) => fixture.fixtureId)).toEqual(
      schedule.playoffs.map((fixture) => fixture.id),
    );
    expect(series.championId).toBeTruthy();
    expect(seasonChampion(schedule, standings, series.results)).toBe(series.championId);
  });
});
