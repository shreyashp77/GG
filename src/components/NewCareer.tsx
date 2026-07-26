import { useMemo, useState } from "react";
import type { CareerSave, FranchiseId } from "../domain/models";
import { franchises } from "../data/franchises";
import { officialTeamTotals, players } from "../data/squads";
import { createCareer } from "../services/careerStore";
import { Mark } from "./Mark";
import { TeamBadge } from "./TeamBadge";

export function NewCareer({ onCreated }: { onCreated: (career: CareerSave) => void }) {
  const [selectedId, setSelectedId] = useState<FranchiseId>("csk");
  const [coachName, setCoachName] = useState("");
  const [saving, setSaving] = useState(false);
  const team = franchises.find((item) => item.id === selectedId)!;
  const squad = useMemo(
    () => players.filter((player) => player.franchiseId === selectedId),
    [selectedId],
  );
  const stars = [...squad].sort((a, b) => b.salaryLakhs - a.salaryLakhs).slice(0, 3);
  const total = officialTeamTotals[selectedId];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!coachName.trim()) return;
    setSaving(true);
    try {
      onCreated(await createCareer(coachName, selectedId));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="career-setup">
      <header className="setup-header">
        <Mark />
        <span className="edition-pill">2027 career</span>
      </header>

      <section className="setup-intro">
        <p className="eyebrow">Your dugout. Your decisions.</p>
        <h1>Choose where your<br />story starts.</h1>
        <p>
          The 2026 season is in the books. Ten boards are ready to talk.
          Pick a franchise, shape the squad and build your dynasty.
        </p>
      </section>

      <section className="setup-grid">
        <div className="team-picker">
          <div className="section-heading">
            <div>
              <span>01</span>
              <h2>Select a franchise</h2>
            </div>
            <small>10 clubs</small>
          </div>
          <div className="team-grid">
            {franchises.map((item) => (
              <button
                className={`team-option ${item.id === selectedId ? "is-selected" : ""}`}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                type="button"
              >
                <TeamBadge team={item} />
                <span>
                  <strong>{item.shortName}</strong>
                  <small>{item.city}</small>
                </span>
                <i aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <aside
          className="club-preview"
          style={{
            "--team-color": team.primary,
            "--team-accent": team.accent,
          } as React.CSSProperties}
        >
          <div className="preview-watermark">{team.shortName}</div>
          <div className="preview-top">
            <TeamBadge team={team} size="large" />
            <span className="selected-label">Selected club</span>
          </div>
          <h2>{team.name}</h2>
          <p>{team.venue}</p>

          <div className="club-numbers">
            <div><strong>{total.players}</strong><span>Players</span></div>
            <div><strong>{total.overseas}</strong><span>Overseas</span></div>
            <div><strong>₹{(total.purseLakhs / 100).toFixed(1)}cr</strong><span>Available</span></div>
          </div>

          <div className="club-brief">
            <span>Board expectation</span>
            <strong>{team.expectation}</strong>
          </div>
          <div className="key-players">
            <span>Key contracts</span>
            {stars.map((player, index) => (
              <div key={player.id}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <strong>{player.name.replace(" (T)", "")}</strong>
                <em>₹{(player.salaryLakhs / 100).toFixed(1)}cr</em>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <form className="coach-form" onSubmit={submit}>
        <label>
          <span>02</span>
          <div>
            <small>Head coach</small>
            <input
              autoComplete="name"
              maxLength={32}
              onChange={(event) => setCoachName(event.target.value)}
              placeholder="Enter your name"
              value={coachName}
            />
          </div>
        </label>
        <button disabled={!coachName.trim() || saving} type="submit">
          {saving ? "Creating career…" : "Take the job"}
          <span>→</span>
        </button>
      </form>
      <footer className="setup-footer">
        <span>Database 2026.1</span>
        <span>Offline ready</span>
        <span>Seeded simulation</span>
      </footer>
    </main>
  );
}
