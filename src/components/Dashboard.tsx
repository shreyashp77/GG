import type { CareerSave } from "../domain/models";
import { franchises } from "../data/franchises";
import { officialTeamTotals, players } from "../data/squads";
import { TeamBadge } from "./TeamBadge";
import { loadRetentionSubmission } from "../services/retentionStore";

export function Dashboard({
  career,
  openSquad,
}: {
  career: CareerSave;
  openSquad: () => void;
}) {
  const team = franchises.find((item) => item.id === career.franchiseId)!;
  const squad = players.filter((player) => player.franchiseId === career.franchiseId);
  const finances = officialTeamTotals[career.franchiseId];
  const retentionSubmission = loadRetentionSubmission(career.franchiseId);
  const submittedReleaseIds = new Set(retentionSubmission?.releasedPlayerIds ?? []);
  const retentionSubmitted = retentionSubmission !== null;
  const releasedPlayers = squad.filter((player) => submittedReleaseIds.has(player.id));
  const releasedValue = releasedPlayers.reduce(
    (sum, player) => sum + player.salaryLakhs,
    0,
  );
  const activeSquad = squad.filter((player) => !submittedReleaseIds.has(player.id));
  const topPlayers = [...activeSquad]
    .sort((a, b) => b.salaryLakhs - a.salaryLakhs)
    .slice(0, 4);
  const availablePurse = finances.purseLakhs + releasedValue;
  const committedSalary = finances.spentLakhs - releasedValue;
  const currentDate = new Date(`${career.currentDate}T12:00:00`);
  const deadline = new Date("2026-06-15T12:00:00");
  const daysToDeadline = Math.ceil(
    (deadline.getTime() - currentDate.getTime()) / 86_400_000,
  );
  const dateLabel = currentDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const currentDay = currentDate.getDate();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const calendarTitle = currentDate.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const leadingBlankDays = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const calendarDays: Array<number | null> = [
    ...Array.from({ length: leadingBlankDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const isRetentionMonth = currentYear === 2026 && currentMonth === 5;

  return (
    <section className="dashboard">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">{dateLabel}</p>
          <h1>Good morning, {career.coachName}.</h1>
          <p>
            {retentionSubmitted
              ? `Your preliminary retention list is submitted with ${activeSquad.length} players.`
              : daysToDeadline < 0
                ? "The retention deadline has passed and your preliminary list is unresolved."
                : daysToDeadline === 0
                  ? "The retention deadline is today. Your preliminary list is due."
                  : `The offseason is moving. Your first call is due in ${daysToDeadline} day${daysToDeadline === 1 ? "" : "s"}.`}
          </p>
        </div>
        <div className="season-marker">
          <span>Season</span>
          <strong>2027</strong>
        </div>
      </div>

      <div className="dashboard-grid">
        <article
          className="club-card"
          style={{
            "--team-color": team.primary,
            "--team-accent": team.accent,
          } as React.CSSProperties}
        >
          <div className="club-card-head">
            <TeamBadge team={team} size="large" />
            <div>
              <span>Your club</span>
              <h2>{team.name}</h2>
              <p>{team.venue}</p>
            </div>
          </div>
          <div className="expectation-track">
            <div><span>Board expectation</span><strong>{team.expectation}</strong></div>
            <i><b /></i>
            <small>Board confidence · Secure</small>
          </div>
        </article>

        <article className="deadline-card">
          <div className="card-kicker">
            <span>{retentionSubmitted ? "Retention list" : "Next deadline"}</span>
            <em>
              {retentionSubmitted
                ? "Submitted"
                : daysToDeadline < 0
                  ? "Overdue"
                  : daysToDeadline === 0
                  ? "Today"
                  : `${daysToDeadline} day${daysToDeadline === 1 ? "" : "s"}`}
            </em>
          </div>
          <h2>
            {retentionSubmitted
              ? <>{activeSquad.length} retained<br />{releasedPlayers.length} released</>
              : <>Confirm releases<br />and retentions</>}
          </h2>
          <p>
            {retentionSubmitted
              ? `Your preliminary list adds ₹${(releasedValue / 100).toFixed(2)}cr to the auction purse.`
              : "Review every contract before submitting your preliminary 2027 squad."}
          </p>
          <button onClick={openSquad}>
            {retentionSubmitted ? "View submitted list" : "Review squad"} <span>→</span>
          </button>
        </article>

        <article className="money-card">
          <div className="card-kicker"><span>Squad finances</span><em>₹125cr cap</em></div>
          <div className="money-number">
            <strong>₹{(availablePurse / 100).toFixed(2)}cr</strong>
            <span>available purse</span>
          </div>
          <div className="money-bar"><b style={{ width: `${(committedSalary / 12500) * 100}%` }} /></div>
          <div className="money-labels">
            <span>Committed ₹{(committedSalary / 100).toFixed(2)}cr</span>
            <span>{activeSquad.length}/25 slots</span>
          </div>
        </article>

        <article className="inbox-card">
          <div className="card-kicker"><span>Inbox</span><em>3 unread</em></div>
          <div className="message-row is-unread">
            <b>Board</b><div><strong>Welcome to {team.shortName}</strong><span>Our expectations for the season</span></div><time>09:00</time>
          </div>
          <div className="message-row is-unread">
            <b>AC</b><div><strong>Initial squad assessment</strong><span>Three areas need your attention</span></div><time>08:42</time>
          </div>
          <div className="message-row">
            <b>IPL</b><div><strong>Offseason calendar</strong><span>Key registration dates confirmed</span></div><time>Yesterday</time>
          </div>
        </article>

        <article className="squad-snapshot">
          <div className="card-kicker"><span>Core squad</span><button onClick={openSquad}>View all</button></div>
          {topPlayers.map((player, index) => (
            <div className="snapshot-player" key={player.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{player.name.replace(" (T)", "")}</strong><small>{player.role}</small></div>
              <em>₹{(player.salaryLakhs / 100).toFixed(1)}cr</em>
            </div>
          ))}
        </article>

        <article className="calendar-card">
          <div className="card-kicker"><span>{calendarTitle}</span><em>Offseason</em></div>
          <div className="mini-calendar">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <b key={`${day}${index}`}>{day}</b>)}
            {calendarDays.map((day, index) =>
              day === null ? (
                <span className="calendar-blank" key={`blank-${index}`} />
              ) : (
                <span
                  className={[
                    day === currentDay ? "today" : "",
                    isRetentionMonth && day === 15 ? "deadline" : "",
                  ].filter(Boolean).join(" ")}
                  key={day}
                >
                  {day}
                </span>
              ),
            )}
          </div>
          <div className="calendar-note">
            <i />
            <span>
              <strong>15 June</strong>
              {retentionSubmitted
                ? " Retention list submitted"
                : daysToDeadline < 0
                  ? " Retention deadline missed"
                  : " Retention submission deadline"}
            </span>
          </div>
        </article>
      </div>
    </section>
  );
}
