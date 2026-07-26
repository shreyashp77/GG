import { describe, expect, it } from "vitest";
import { franchises } from "./franchises";
import { officialTeamTotals, players } from "./squads";

describe("frozen 2026 IPL database", () => {
  it("contains ten unique franchises", () => {
    expect(franchises).toHaveLength(10);
    expect(new Set(franchises.map((team) => team.id)).size).toBe(10);
  });

  it("contains unique player identities with bounded ratings", () => {
    expect(players).toHaveLength(173);
    expect(new Set(players.map((player) => player.id)).size).toBe(players.length);

    for (const player of players) {
      const ratings = [
        ...Object.values(player.ratings.batting),
        ...Object.values(player.ratings.bowling),
        player.ratings.fielding,
        player.ratings.wicketkeeping,
        player.ratings.leadership,
        player.ratings.fitness,
        player.ratings.form,
        player.ratings.potential,
      ];
      expect(ratings.every((rating) => rating >= 1 && rating <= 100)).toBe(true);
    }
  });

  it("matches every official squad count, overseas count and salary total", () => {
    const mismatches: string[] = [];
    for (const team of franchises) {
      const squad = players.filter((player) => player.franchiseId === team.id);
      const official = officialTeamTotals[team.id];
      const actual = {
        players: squad.length,
        overseas: squad.filter((player) => player.overseas).length,
        spentLakhs:
          squad.reduce((sum, player) => sum + player.salaryLakhs, 0) +
          official.capAdjustmentLakhs,
      };
      if (
        actual.players !== official.players ||
        actual.overseas !== official.overseas ||
        actual.spentLakhs !== official.spentLakhs
      ) {
        mismatches.push(`${team.id}: ${JSON.stringify(actual)} != ${JSON.stringify(official)}`);
      }
      expect(official.spentLakhs + official.purseLakhs).toBe(12_500);
    }
    expect(mismatches).toEqual([]);
  });
});
