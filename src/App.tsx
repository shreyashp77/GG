import { useEffect, useState } from "react";
import type { CareerSave } from "./domain/models";
import { loadCareer } from "./services/careerStore";
import { saveCareer } from "./services/careerStore";
import { NewCareer } from "./components/NewCareer";
import { Dashboard } from "./components/Dashboard";
import { PlayerBrowser } from "./components/PlayerBrowser";
import { SettingsPage } from "./components/SettingsPage";
import { SquadPage } from "./components/SquadPage";
import { SeasonPage } from "./components/SeasonPage";
import { Mark } from "./components/Mark";
import { TeamBadge } from "./components/TeamBadge";
import { franchises } from "./data/franchises";
import { loadRetentionSubmission } from "./services/retentionStore";

type Page = "home" | "squad" | "database" | "calendar" | "auction" | "settings";

const nav: { id: Page; label: string; glyph: string }[] = [
  { id: "home", label: "Home", glyph: "⌂" },
  { id: "squad", label: "Squad", glyph: "◉" },
  { id: "database", label: "Database", glyph: "⌕" },
  { id: "calendar", label: "Fixtures", glyph: "▦" },
  { id: "auction", label: "Auction", glyph: "◇" },
];

export default function App() {
  const [career, setCareer] = useState<CareerSave | null | undefined>(undefined);
  const [page, setPage] = useState<Page>("home");
  const [advancing, setAdvancing] = useState(false);
  const [advanceNotice, setAdvanceNotice] = useState("");

  useEffect(() => {
    loadCareer().then(setCareer).catch(() => setCareer(null));
  }, []);

  useEffect(() => {
    try {
      const preferences = JSON.parse(window.localStorage.getItem("gg-preferences") ?? "{}");
      document.documentElement.classList.toggle("dark-mode", preferences.darkMode === true);
      document.documentElement.classList.toggle("compact-tables", preferences.compactTables === true);
      document.documentElement.classList.toggle("reduced-motion", preferences.reducedMotion === true);
    } catch {
      // Invalid preferences should never prevent a career from loading.
    }
  }, []);

  if (career === undefined) {
    return <div className="app-loading"><Mark /><span>Loading database…</span></div>;
  }

  if (!career) {
    return <NewCareer onCreated={setCareer} />;
  }

  const activeCareer = career;
  const team = franchises.find((item) => item.id === activeCareer.franchiseId)!;
  const careerDate = new Date(`${activeCareer.currentDate}T12:00:00`);
  const careerStart = new Date("2026-06-08T12:00:00");
  const dayNumber = Math.floor((careerDate.getTime() - careerStart.getTime()) / 86_400_000) + 1;
  const headerDate = careerDate
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();

  async function continueCareer() {
    if (advancing) return;
    const nextDate = new Date(careerDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const retentionDeadline = "2026-06-15";
    const hasSubmitted = loadRetentionSubmission(activeCareer.franchiseId) !== null;
    const nextDateString = nextDate.toISOString().slice(0, 10);

    if (
      nextDateString >= retentionDeadline &&
      !hasSubmitted &&
      !window.confirm(
        "Your preliminary retention list is unresolved. Advance to the deadline anyway?",
      )
    ) {
      setPage("squad");
      return;
    }

    setAdvancing(true);
    try {
      const updated: CareerSave = { ...activeCareer, currentDate: nextDateString };
      await saveCareer(updated);
      setCareer(updated);
      setAdvanceNotice(
        nextDate.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
      );
      window.setTimeout(() => setAdvanceNotice(""), 2200);
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Mark />
        <nav>
          {nav.map((item) => (
            <button
              className={page === item.id ? "active" : ""}
              key={item.id}
              onClick={() => setPage(item.id)}
              title={item.label}
            >
              <span>{item.glyph}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={page === "settings" ? "active" : ""}
            onClick={() => setPage("settings")}
            title="Settings"
          >
            <span>⚙</span><small>Settings</small>
          </button>
          <div className="coach-avatar">{activeCareer.coachName.slice(0, 2).toUpperCase()}</div>
        </div>
      </aside>

      <div className="shell-content">
        <header className="topbar">
          <div className="mobile-brand"><Mark compact /></div>
          <div className="club-identity">
            <TeamBadge team={team} size="small" />
            <div><strong>{team.shortName}</strong><span>Head coach</span></div>
          </div>
          <div className="topbar-center">
            <span>Offseason</span><i /><strong>{headerDate}</strong><i /><span>Day {dayNumber}</span>
          </div>
          <div className="top-actions">
            <button className="continue-button" disabled={advancing} onClick={continueCareer}>
              {advancing ? "Advancing…" : "Continue"} <span>→</span>
            </button>
          </div>
        </header>
        {advanceNotice && (
          <div className="advance-notice" role="status">
            <span>Calendar advanced</span>
            <strong>{advanceNotice}</strong>
          </div>
        )}

        <div className="page-content">
          {page === "home" && <Dashboard career={activeCareer} openSquad={() => setPage("squad")} />}
          {page === "squad" && <SquadPage franchiseId={activeCareer.franchiseId} />}
          {page === "database" && <PlayerBrowser />}
          {page === "settings" && <SettingsPage career={activeCareer} />}
          {page === "calendar" && <SeasonPage career={activeCareer} />}
          {page === "auction" && (
            <section className="placeholder-page">
              <p className="eyebrow">Coming in the next slice</p>
              <h1>Live player auction</h1>
              <p>The domain boundary is ready; this interaction arrives with the season and auction engines.</p>
              <button onClick={() => setPage("home")}>Back to club hub</button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
