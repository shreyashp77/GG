import { useMemo, useState } from "react";
import type { FranchiseId, Player, PlayerRole } from "../domain/models";
import { franchises } from "../data/franchises";
import { players } from "../data/squads";
import { TeamBadge } from "./TeamBadge";

const roleLabels: Record<PlayerRole, string> = {
  batter: "Batter",
  wicketkeeper: "Wicketkeeper",
  "all-rounder": "All-rounder",
  bowler: "Bowler",
  unknown: "Unknown",
};

function overall(player: Player) {
  const batting = Object.values(player.ratings.batting);
  const bowling = Object.values(player.ratings.bowling);
  const primary = player.role === "bowler"
    ? bowling
    : player.role === "all-rounder"
      ? [...batting, ...bowling]
      : batting;
  return Math.round(primary.reduce((sum, rating) => sum + rating, 0) / primary.length);
}

export function PlayerBrowser({ initialTeam }: { initialTeam?: FranchiseId }) {
  const [query, setQuery] = useState("");
  const [teamId, setTeamId] = useState<FranchiseId | "all">(initialTeam ?? "all");
  const [role, setRole] = useState<PlayerRole | "all">("all");
  const [selected, setSelected] = useState<Player | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return players
      .filter((player) => teamId === "all" || player.franchiseId === teamId)
      .filter((player) => role === "all" || player.role === role)
      .filter((player) => !normalized || player.name.toLowerCase().includes(normalized))
      .sort((a, b) => overall(b) - overall(a));
  }, [query, role, teamId]);

  return (
    <section className="browser-page">
      <div className="page-title">
        <div>
          <p className="eyebrow">Scouting centre</p>
          <h1>Player database</h1>
        </div>
        <div className="database-count">
          <strong>{players.length}</strong>
          <span>real players in<br />the 2026 IPL pack</span>
        </div>
      </div>

      <div className="filter-bar">
        <label className="search-box">
          <span>⌕</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search players"
            value={query}
          />
        </label>
        <select value={teamId} onChange={(event) => setTeamId(event.target.value as FranchiseId | "all")}>
          <option value="all">All franchises</option>
          {franchises.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
        <select value={role} onChange={(event) => setRole(event.target.value as PlayerRole | "all")}>
          <option value="all">All roles</option>
          {Object.entries(roleLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="player-table-wrap">
        <table className="player-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Club</th>
              <th>Role</th>
              <th>Origin</th>
              <th>Contract</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((player) => {
              const team = franchises.find((item) => item.id === player.franchiseId)!;
              return (
                <tr key={player.id} onClick={() => setSelected(player)}>
                  <td><strong>{player.name.replace(" (T)", "")}</strong>{player.name.includes("(T)") && <small>Transfer</small>}</td>
                  <td><TeamBadge team={team} size="small" /><span>{team.shortName}</span></td>
                  <td>{roleLabels[player.role]}</td>
                  <td>{player.overseas ? "Overseas" : "India"}</td>
                  <td>₹{(player.salaryLakhs / 100).toFixed(2)}cr</td>
                  <td><b className="rating-number">{overall(player)}</b></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length && <div className="empty-state">No players match those filters.</div>}
      </div>

      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <aside className="player-drawer" onClick={(event) => event.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelected(null)}>×</button>
            <p className="eyebrow">Player profile</p>
            <h2>{selected.name.replace(" (T)", "")}</h2>
            <div className="profile-meta">
              <span>{roleLabels[selected.role]}</span>
              <span>{selected.overseas ? "Overseas" : "India"}</span>
              <span>₹{(selected.salaryLakhs / 100).toFixed(2)}cr</span>
            </div>
            <div className="overall-score">
              <strong>{overall(selected)}</strong>
              <span>Current<br />rating</span>
            </div>
            <RatingGroup title="Batting" ratings={selected.ratings.batting} />
            <RatingGroup title="Bowling" ratings={selected.ratings.bowling} />
            <div className="quality-note">
              <span>Data status</span>
              <p>Official contract verified. Biographical details and empirical attributes await registry enrichment.</p>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function RatingGroup({ title, ratings }: { title: string; ratings: Record<string, number> }) {
  return (
    <div className="rating-group">
      <h3>{title}</h3>
      {Object.entries(ratings).map(([label, value]) => (
        <div className="rating-row" key={label}>
          <span>{label}</span>
          <i><b style={{ width: `${value}%` }} /></i>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
