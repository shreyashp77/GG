import { players } from "./squads";

export const dataQualityReport = {
  generatedAt: "2026-07-26",
  playerCount: players.length,
  verifiedIdentityCount: 0,
  fallbackMetadataCount: players.filter((player) => player.metadataQuality === "fallback").length,
  notes: [
    "Squad membership, overseas classification and salary deductions come from the official IPL squad sheet.",
    "Four clubs have an explicit cap adjustment reconciling listed contracts with the official purse total.",
    "Roles are a manually seeded first-pass classification for the browser experience.",
    "Dates of birth, handedness, bowling style, nationality and empirical ratings await Cricsheet registry enrichment.",
    "Current ratings are deterministic neutral estimates, not final empirical player ratings.",
  ],
};
