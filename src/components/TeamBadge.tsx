import type { Franchise } from "../domain/models";

export function TeamBadge({
  team,
  size = "medium",
}: {
  team: Franchise;
  size?: "small" | "medium" | "large";
}) {
  return (
    <span
      className={`team-badge team-badge--${size}`}
      style={{
        "--team-color": team.primary,
        "--team-accent": team.accent,
      } as React.CSSProperties}
      title={team.name}
    >
      {team.shortName}
    </span>
  );
}
