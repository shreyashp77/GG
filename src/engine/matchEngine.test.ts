import { describe, expect, it } from "vitest";
import { buildEngineTeam } from "./teamBuilder";
import { simulateMatch } from "./matchEngine";
import type { MatchSimulationInput } from "./types";

function input(seed = 2027): MatchSimulationInput {
  return {
    fixtureId: "test-mi-csk",
    seed,
    home: buildEngineTeam("mi"),
    away: buildEngineTeam("csk"),
    userTeamId: "mi",
    tossCall: "heads",
    tossDecision: "bowl",
    tactics: {
      battingIntent: "balanced",
      bowlingPlan: "balanced",
      field: "balanced",
    },
  };
}

describe("deterministic match engine", () => {
  it("returns identical matches for identical inputs", () => {
    expect(simulateMatch(input())).toEqual(simulateMatch(input()));
  });

  it("keeps legal-ball and score transitions internally consistent", () => {
    const result = simulateMatch(input(91_337));

    expect(result.innings).toHaveLength(2);
    for (const innings of result.innings) {
      expect(innings.legalBalls).toBeLessThanOrEqual(120);
      expect(innings.wickets).toBeLessThanOrEqual(10);
      expect(innings.batters.reduce((sum, batter) => sum + batter.balls, 0))
        .toBe(innings.legalBalls);
      expect(innings.bowlers.every((bowler) => bowler.balls <= 24)).toBe(true);

      const inningsEvents = result.events.filter(
        (event) => event.battingTeamId === innings.battingTeamId,
      );
      expect(
        inningsEvents.reduce(
          (sum, event) => sum + event.runsOffBat + event.extras,
          0,
        ),
      ).toBe(innings.runs);
      expect(inningsEvents.filter((event) => event.legalBall)).toHaveLength(
        innings.legalBalls,
      );
    }
  });

  it("ends a successful chase immediately after reaching the target", () => {
    const result = simulateMatch(input(481));
    const chase = result.innings[1];

    if (chase.runs > result.innings[0].runs) {
      const finalEvent = result.events.at(-1)!;
      expect(finalEvent.score).toBe(chase.runs);
      expect(finalEvent.score).toBeGreaterThanOrEqual(result.innings[0].runs + 1);
      expect(chase.legalBalls).toBeLessThanOrEqual(120);
    }
  });

  it("changes the simulation when tactical intent changes", () => {
    const balanced = simulateMatch(input(7_777));
    const attackingInput = input(7_777);
    attackingInput.tactics = {
      battingIntent: "attacking",
      bowlingPlan: "wickets",
      field: "attacking",
    };
    const attacking = simulateMatch(attackingInput);

    expect(attacking.events).not.toEqual(balanced.events);
  });

  it("keeps a 100-match smoke sample inside broad T20 bounds", () => {
    let totalRuns = 0;
    let totalWickets = 0;
    for (let seed = 1; seed <= 100; seed += 1) {
      const result = simulateMatch(input(seed));
      for (const innings of result.innings) {
        totalRuns += innings.runs;
        totalWickets += innings.wickets;
        expect(innings.runs).toBeLessThan(350);
      }
    }

    const meanRuns = totalRuns / 200;
    const meanWickets = totalWickets / 200;
    expect(meanRuns).toBeGreaterThan(105);
    expect(meanRuns).toBeLessThan(235);
    expect(meanWickets).toBeGreaterThan(2);
    expect(meanWickets).toBeLessThan(10);
  });
});
