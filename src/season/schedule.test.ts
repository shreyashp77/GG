import { describe, expect, it } from "vitest";
import { franchises } from "../data/franchises";
import { generateSeasonSchedule } from "./schedule";

describe("2027 season schedule", () => {
  it("is deterministic and contains 70 league matches plus four playoffs", () => {
    const first = generateSeasonSchedule(2027);
    const second = generateSeasonSchedule(2027);
    expect(first).toEqual(second);
    expect(first.leagueFixtures).toHaveLength(70);
    expect(first.playoffs).toHaveLength(4);
  });

  it("gives every franchise 14 matches and seven home games", () => {
    const schedule = generateSeasonSchedule(99);
    for (const team of franchises) {
      const matches = schedule.leagueFixtures.filter(
        (fixture) => fixture.homeId === team.id || fixture.awayId === team.id,
      );
      expect(matches).toHaveLength(14);
      expect(matches.filter((fixture) => fixture.homeId === team.id)).toHaveLength(7);
    }
  });

  it("never schedules a team twice on one day or on consecutive days", () => {
    const schedule = generateSeasonSchedule(5_901);
    for (const team of franchises) {
      const dates = schedule.leagueFixtures
        .filter((fixture) => fixture.homeId === team.id || fixture.awayId === team.id)
        .map((fixture) => new Date(`${fixture.date}T00:00:00Z`).getTime())
        .sort((a, b) => a - b);
      for (let index = 1; index < dates.length; index += 1) {
        expect((dates[index] - dates[index - 1]) / 86_400_000).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("supports later career seasons with season-specific fixture IDs and dates", () => {
    const schedule = generateSeasonSchedule(99, 2028);

    expect(schedule.season).toBe(2028);
    expect(schedule.leagueFixtures[0].id).toMatch(/^ipl-2028-/);
    expect(schedule.leagueFixtures[0].date.startsWith("2028-")).toBe(true);
    expect(schedule.playoffs.at(-1)?.id).toBe("ipl-2028-final");
  });
});
