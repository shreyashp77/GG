import { describe, expect, it } from "vitest";
import type { CareerSave } from "../domain/models";
import { generateSeasonSchedule } from "./schedule";
import {
  advanceCareerToNextSeason,
  fixtureSeed,
  simulateFixture,
  simulateUnplayedAIFixtures,
} from "./seasonEngine";

describe("season fixture simulation", () => {
  it("uses a stable seed for each fixture", () => {
    expect(fixtureSeed(2027, "ipl-2027-01")).toBe(
      fixtureSeed(2027, "ipl-2027-01"),
    );
    expect(fixtureSeed(2027, "ipl-2027-01")).not.toBe(
      fixtureSeed(2027, "ipl-2027-02"),
    );
  });

  it("returns deterministic, standings-ready results", () => {
    const fixture = generateSeasonSchedule(2027).leagueFixtures[0];
    const first = simulateFixture(fixture, 2027);
    const second = simulateFixture(fixture, 2027);

    expect(first).toEqual(second);
    expect(first.fixtureId).toBe(fixture.id);
    expect(first.homeRuns).toBeGreaterThanOrEqual(0);
    expect(first.awayRuns).toBeGreaterThanOrEqual(0);
    expect(first.homeBalls).toBeGreaterThan(0);
    expect(first.awayBalls).toBeGreaterThan(0);
  });

  it("skips completed fixtures and the user's own fixtures", () => {
    const fixtures = generateSeasonSchedule(2027).leagueFixtures.slice(0, 3);
    const completed = [simulateFixture(fixtures[0], 2027)];
    const remaining = simulateUnplayedAIFixtures(fixtures, completed, 2027, "mi");

    expect(remaining.some((fixture) => fixture.fixtureId === fixtures[0].id)).toBe(false);
    expect(remaining.every((fixture) => fixture.homeId !== "mi" && fixture.awayId !== "mi")).toBe(true);
  });

  it("starts the next season while preserving the previous champion", () => {
    const career: CareerSave = {
      id: "primary",
      schemaVersion: 4,
      databaseVersion: "ipl-2026.1",
      rulesetVersion: "ipl-2027-frozen.1",
      coachName: "Test Coach",
      franchiseId: "mi",
      season: 2027,
      currentDate: "2027-06-01",
      seed: 42,
      createdAt: "2026-01-01T00:00:00.000Z",
      seasonState: {
        season: 2027,
        scheduleSeed: 42 ^ 2027,
        completedFixtures: [{
          fixtureId: "ipl-2027-final",
          homeId: "mi",
          awayId: "csk",
          homeRuns: 180,
          homeBalls: 120,
          awayRuns: 170,
          awayBalls: 120,
        }],
        championId: "mi",
      },
      seasonHistory: [],
    };

    const next = advanceCareerToNextSeason(career);
    expect(next.season).toBe(2028);
    expect(next.currentDate).toBe("2028-03-01");
    expect(next.seasonState.scheduleSeed).toBe((42 ^ 2028) >>> 0);
    expect(next.seasonState.completedFixtures).toEqual([]);
    expect(next.seasonState.championId).toBeNull();
    expect(next.seasonHistory).toEqual([{ season: 2027, championId: "mi" }]);
  });
});
