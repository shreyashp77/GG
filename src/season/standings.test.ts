import { describe, expect, it } from "vitest";
import { buildEngineTeam } from "../engine/teamBuilder";
import { simulateMatch } from "../engine/matchEngine";
import { generateSeasonSchedule } from "./schedule";
import { calculateStandings, completedFixtureFromMatch } from "./standings";

describe("season standings", () => {
  it("awards wins and ties and sorts by points then net run rate", () => {
    const table = calculateStandings([
      {
        fixtureId: "1",
        homeId: "mi",
        awayId: "csk",
        homeRuns: 180,
        homeBalls: 120,
        awayRuns: 160,
        awayBalls: 120,
      },
      {
        fixtureId: "2",
        homeId: "rcb",
        awayId: "srh",
        homeRuns: 170,
        homeBalls: 120,
        awayRuns: 170,
        awayBalls: 120,
      },
    ]);

    expect(table[0].franchiseId).toBe("mi");
    expect(table[0].points).toBe(2);
    expect(table[0].netRunRate).toBeCloseTo(1);
    expect(table.find((row) => row.franchiseId === "rcb")?.points).toBe(1);
    expect(table.find((row) => row.franchiseId === "csk")?.lost).toBe(1);
  });

  it("maps a simulated result back to the scheduled home and away teams", () => {
    const fixture = generateSeasonSchedule(2027).leagueFixtures[0];
    const result = simulateMatch({
      fixtureId: fixture.id,
      seed: 88,
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
    expect(completed.fixtureId).toBe(fixture.id);
    expect(completed.homeId).toBe(fixture.homeId);
    expect(completed.awayId).toBe(fixture.awayId);
    expect(completed.homeRuns).toBeGreaterThanOrEqual(0);
    expect(completed.awayRuns).toBeGreaterThanOrEqual(0);
  });
});
