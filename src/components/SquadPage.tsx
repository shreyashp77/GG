import { useMemo, useState } from "react";
import type { FranchiseId, Player } from "../domain/models";
import { franchises } from "../data/franchises";
import { officialTeamTotals, players } from "../data/squads";
import { TeamBadge } from "./TeamBadge";
import {
  loadRetentionSubmission,
  saveRetentionSubmission,
} from "../services/retentionStore";

type Decision = "retain" | "review" | "release";

const roleLabels = {
  batter: "Batter",
  wicketkeeper: "Wicketkeeper",
  "all-rounder": "All-rounder",
  bowler: "Bowler",
  unknown: "Unknown",
};

function playerRating(player: Player): number {
  const batting = Object.values(player.ratings.batting);
  const bowling = Object.values(player.ratings.bowling);
  const values = player.role === "bowler"
    ? bowling
    : player.role === "all-rounder"
      ? [...batting, ...bowling]
      : batting;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function SquadPage({ franchiseId }: { franchiseId: FranchiseId }) {
  const team = franchises.find((item) => item.id === franchiseId)!;
  const squad = useMemo(
    () => players
      .filter((player) => player.franchiseId === franchiseId)
      .sort((a, b) => b.salaryLakhs - a.salaryLakhs),
    [franchiseId],
  );
  const savedSubmission = useMemo(() => {
    return loadRetentionSubmission(franchiseId);
  }, [franchiseId]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>(
    Object.fromEntries(
      squad.map((player) => [
        player.id,
        savedSubmission?.releasedPlayerIds.includes(player.id) ? "release" : "retain",
      ]),
    ),
  );
  const [filter, setFilter] = useState<Decision | "all">("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(Boolean(savedSubmission));
  const totals = officialTeamTotals[franchiseId];
  const released = squad.filter((player) => decisions[player.id] === "release");
  const releasedValue = released.reduce((sum, player) => sum + player.salaryLakhs, 0);
  const visible = squad.filter((player) => filter === "all" || decisions[player.id] === filter);

  function cycleDecision(playerId: string) {
    if (submitted) return;
    setDecisions((current) => {
      const next: Record<Decision, Decision> = {
        retain: "review",
        review: "release",
        release: "retain",
      };
      return { ...current, [playerId]: next[current[playerId]] };
    });
  }

  function confirmSubmission() {
    const submission = {
      franchiseId,
      submittedAt: new Date().toISOString(),
      retainedPlayerIds: squad
        .filter((player) => decisions[player.id] !== "release")
        .map((player) => player.id),
      releasedPlayerIds: released.map((player) => player.id),
    };
    saveRetentionSubmission(submission);
    setSubmitted(true);
    setConfirmOpen(false);
  }

  return (
    <section className="squad-page">
      <div className="squad-heading">
        <div>
          <p className="eyebrow">First-team management</p>
          <h1>Squad room</h1>
          <p>Set your preliminary retention list before the 15 June deadline.</p>
        </div>
        <div className="squad-club">
          <TeamBadge team={team} size="medium" />
          <div><strong>{team.name}</strong><span>{team.venue}</span></div>
        </div>
      </div>

      <div className="squad-summary">
        <article>
          <span>Registered</span>
          <strong>{squad.length}<small>/25</small></strong>
          <p>{8 - totals.overseas} overseas slots open</p>
        </article>
        <article>
          <span>Current purse</span>
          <strong>₹{(totals.purseLakhs / 100).toFixed(2)}<small>cr</small></strong>
          <p>Before releases</p>
        </article>
        <article>
          <span>Projected purse</span>
          <strong>₹{((totals.purseLakhs + releasedValue) / 100).toFixed(2)}<small>cr</small></strong>
          <p className={releasedValue ? "positive" : ""}>
            {releasedValue ? `+₹${(releasedValue / 100).toFixed(2)}cr released` : "No releases marked"}
          </p>
        </article>
        <article>
          <span>Board target</span>
          <strong className="target-text">{team.expectation}</strong>
          <p>Confidence: secure</p>
        </article>
      </div>

      <div className="squad-toolbar">
        <div className="decision-tabs">
          {(["all", "retain", "review", "release"] as const).map((value) => (
            <button
              className={filter === value ? "active" : ""}
              key={value}
              onClick={() => setFilter(value)}
            >
              {value === "all" ? "All players" : value}
              <span>
                {value === "all"
                  ? squad.length
                  : squad.filter((player) => decisions[player.id] === value).length}
              </span>
            </button>
          ))}
        </div>
        <p>Click a player’s decision to cycle its status.</p>
      </div>

      <div className="squad-table-wrap">
        <table className="squad-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Role</th>
              <th>Type</th>
              <th>Rating</th>
              <th>Contract</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((player) => (
              <tr key={player.id}>
                <td>
                  <span className="squad-number">{String(squad.indexOf(player) + 1).padStart(2, "0")}</span>
                  <strong>{player.name.replace(" (T)", "")}</strong>
                  {player.name.includes("(T)") && <small>Transfer</small>}
                </td>
                <td>{roleLabels[player.role]}</td>
                <td>{player.overseas ? "Overseas" : "Indian"}</td>
                <td><b className="rating-number">{playerRating(player)}</b></td>
                <td>₹{(player.salaryLakhs / 100).toFixed(2)}cr</td>
                <td>
                  <button
                    className={`decision-button decision-button--${decisions[player.id]}`}
                    disabled={submitted}
                    onClick={() => cycleDecision(player.id)}
                  >
                    {decisions[player.id]}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="squad-submit">
        <p>
          {submitted
            ? <><strong>Submitted</strong> · {squad.length - released.length} retained, {released.length} released</>
            : <><strong>{released.length}</strong> releases marked · projected squad size {squad.length - released.length}</>}
        </p>
        <button
          className={submitted ? "is-submitted" : ""}
          disabled={!released.length || submitted}
          onClick={() => setConfirmOpen(true)}
        >
          {submitted ? "Preliminary list submitted" : "Submit preliminary list"}
          <span>{submitted ? "✓" : "→"}</span>
        </button>
      </div>

      {confirmOpen && (
        <div className="submission-backdrop" onClick={() => setConfirmOpen(false)}>
          <div
            aria-labelledby="submission-title"
            aria-modal="true"
            className="submission-dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <p className="eyebrow">Retention deadline</p>
            <h2 id="submission-title">Submit this preliminary list?</h2>
            <p>
              You will retain <strong>{squad.length - released.length} players</strong> and
              release <strong>{released.length} player{released.length === 1 ? "" : "s"}</strong>,
              adding ₹{(releasedValue / 100).toFixed(2)}cr to your projected purse.
            </p>
            <div className="release-summary">
              <span>Marked for release</span>
              {released.map((player) => (
                <div key={player.id}>
                  <strong>{player.name.replace(" (T)", "")}</strong>
                  <em>₹{(player.salaryLakhs / 100).toFixed(2)}cr</em>
                </div>
              ))}
            </div>
            <div className="submission-actions">
              <button onClick={() => setConfirmOpen(false)}>Go back</button>
              <button onClick={confirmSubmission}>Confirm submission <span>→</span></button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
