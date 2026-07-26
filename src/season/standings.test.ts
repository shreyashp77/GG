import { describe, expect, it } from "vitest";
import { calculateStandings } from "./standings";

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
});
