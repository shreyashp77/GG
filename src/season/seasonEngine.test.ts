import { describe, expect, it } from "vitest";
import { generateSeasonSchedule } from "./schedule";
import {
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
});
