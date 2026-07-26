import type { FranchiseId, Player } from "../domain/models";
import { franchises } from "../data/franchises";
import { players } from "../data/squads";
import type { EnginePlayer, EngineTeam } from "./types";

function battingRating(player: Player): number {
  const values = Object.values(player.ratings.batting);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function bowlingRating(player: Player): number {
  const values = Object.values(player.ratings.bowling);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function toEnginePlayer(player: Player): EnginePlayer {
  return {
    id: player.id,
    name: player.name.replace(" (T)", ""),
    role: player.role,
    batting: battingRating(player),
    bowling: bowlingRating(player),
    fielding: player.ratings.fielding,
  };
}

export function buildEngineTeam(
  franchiseId: FranchiseId,
  excludedPlayerIds: string[] = [],
): EngineTeam {
  const franchise = franchises.find((team) => team.id === franchiseId)!;
  const available = players
    .filter((player) => player.franchiseId === franchiseId)
    .filter((player) => !excludedPlayerIds.includes(player.id));

  const keeper = available
    .filter((player) => player.role === "wicketkeeper")
    .sort((a, b) => battingRating(b) - battingRating(a))[0];
  const bowlingOptions = available
    .filter((player) => player.role === "bowler" || player.role === "all-rounder")
    .sort((a, b) => bowlingRating(b) - bowlingRating(a))
    .slice(0, 5);

  const selected = new Map<string, Player>();
  if (keeper) selected.set(keeper.id, keeper);
  for (const player of bowlingOptions) selected.set(player.id, player);
  for (
    const player of [...available].sort(
      (a, b) =>
        Math.max(battingRating(b), bowlingRating(b)) -
        Math.max(battingRating(a), bowlingRating(a)),
    )
  ) {
    if (selected.size >= 11) break;
    selected.set(player.id, player);
  }

  const playingXI = [...selected.values()]
    .sort((a, b) => battingRating(b) - battingRating(a))
    .map(toEnginePlayer);

  return {
    id: franchise.id,
    name: franchise.name,
    shortName: franchise.shortName,
    players: playingXI,
  };
}
