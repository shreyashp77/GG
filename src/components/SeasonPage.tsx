import { useMemo, useState } from "react";
import type { CareerSave } from "../domain/models";
import { franchises } from "../data/franchises";
import { generateSeasonSchedule } from "../season/schedule";
import { MatchCenter } from "./MatchCenter";
import { TeamBadge } from "./TeamBadge";
import { calculateStandings } from "../season/standings";

export function SeasonPage({ career }: { career: CareerSave }) {
  const [tab, setTab] = useState<"schedule" | "standings" | "match">("schedule");
  const [filter, setFilter] = useState<"mine" | "all">("mine");
  const schedule = useMemo(
    () => generateSeasonSchedule(career.seed ^ 2027),
    [career.seed],
  );
  const fixtures =
    filter === "mine"
      ? schedule.leagueFixtures.filter(
          (fixture) =>
            fixture.homeId === career.franchiseId ||
            fixture.awayId === career.franchiseId,
        )
      : schedule.leagueFixtures;
  const standings = useMemo(() => calculateStandings([]), []);

  return (
    <div className="season-page">
      <div className="season-tabs">
        <button className={tab === "schedule" ? "active" : ""} onClick={() => setTab("schedule")}>
          2027 schedule
        </button>
        <button className={tab === "standings" ? "active" : ""} onClick={() => setTab("standings")}>
          Standings
        </button>
        <button className={tab === "match" ? "active" : ""} onClick={() => setTab("match")}>
          Exhibition match
        </button>
      </div>

      {tab === "match" ? (
        <MatchCenter career={career} />
      ) : tab === "standings" ? (
        <section className="standings-page">
          <div className="schedule-heading">
            <div>
              <p className="eyebrow">League table</p>
              <h1>Standings</h1>
              <p>The table is ready to consume completed fixtures when the season simulation is connected.</p>
            </div>
          </div>
          <div className="standings-table-wrap">
            <table className="standings-table">
              <thead>
                <tr><th>Pos</th><th>Club</th><th>P</th><th>W</th><th>L</th><th>T</th><th>NRR</th><th>Pts</th></tr>
              </thead>
              <tbody>
                {standings.map((row, index) => {
                  const team = franchises.find((item) => item.id === row.franchiseId)!;
                  return (
                    <tr key={row.franchiseId}>
                      <td>{index + 1}</td>
                      <td><TeamBadge team={team} size="small" /><strong>{team.name}</strong></td>
                      <td>{row.played}</td><td>{row.won}</td><td>{row.lost}</td><td>{row.tied}</td>
                      <td>{row.netRunRate >= 0 ? "+" : ""}{row.netRunRate.toFixed(3)}</td>
                      <td><b>{row.points}</b></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="preseason-table-note">Preseason · no results recorded</div>
        </section>
      ) : (
        <section className="schedule-page">
          <div className="schedule-heading">
            <div>
              <p className="eyebrow">Vertical slice 3 · Seeded calendar</p>
              <h1>IPL 2027</h1>
              <p>Seventy league fixtures, fourteen per club, followed by the four-match playoff series.</p>
            </div>
            <div className="schedule-stat">
              <strong>74</strong><span>Total<br />fixtures</span>
            </div>
          </div>

          <div className="schedule-summary">
            <article><span>League stage</span><strong>70</strong><small>20 Mar — {formatDate(schedule.leagueFixtures.at(-1)!.date)}</small></article>
            <article><span>Your matches</span><strong>14</strong><small>7 home · 7 away</small></article>
            <article><span>Rest rule</span><strong>1+</strong><small>Clear day between matches</small></article>
            <article><span>Final</span><strong>{formatDate(schedule.playoffs.at(-1)!.date)}</strong><small>Neutral venue · evening</small></article>
          </div>

          <div className="schedule-content">
            <div className="fixtures-panel">
              <div className="fixtures-toolbar">
                <span>League fixtures</span>
                <div>
                  <button className={filter === "mine" ? "active" : ""} onClick={() => setFilter("mine")}>My club</button>
                  <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All fixtures</button>
                </div>
              </div>
              <div className="fixtures-list">
                {fixtures.map((fixture, index) => {
                  const home = franchises.find((team) => team.id === fixture.homeId)!;
                  const away = franchises.find((team) => team.id === fixture.awayId)!;
                  return (
                    <div className="fixture-row" key={fixture.id}>
                      <div className="fixture-number">
                        <span>Match</span><strong>{String(schedule.leagueFixtures.indexOf(fixture) + 1).padStart(2, "0")}</strong>
                      </div>
                      <time><strong>{formatDate(fixture.date)}</strong><span>19:30 IST</span></time>
                      <div className="fixture-team is-home">
                        <span>{home.shortName}</span><TeamBadge team={home} size="small" />
                      </div>
                      <b className="fixture-vs">vs</b>
                      <div className="fixture-team">
                        <TeamBadge team={away} size="small" /><span>{away.shortName}</span>
                      </div>
                      <em>{home.venue}</em>
                      {filter === "mine" && index === 0 && (
                        <button onClick={() => setTab("match")}>Preview match →</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="playoff-panel">
              <div className="playoff-heading">
                <span>Playoffs</span><em>Top four qualify</em>
              </div>
              {schedule.playoffs.map((fixture, index) => (
                <div className="playoff-fixture" key={fixture.id}>
                  <b>{index + 71}</b>
                  <div>
                    <span>{stageLabel(fixture.stage)}</span>
                    <strong>{fixture.homeSeed} <i>vs</i> {fixture.awaySeed}</strong>
                    <small>{formatDate(fixture.date)}</small>
                  </div>
                </div>
              ))}
              <div className="playoff-note">
                Participants resolve from the live standings once the league stage is complete.
              </div>
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function stageLabel(stage: "qualifier-1" | "eliminator" | "qualifier-2" | "final") {
  return {
    "qualifier-1": "Qualifier 1",
    eliminator: "Eliminator",
    "qualifier-2": "Qualifier 2",
    final: "Final",
  }[stage];
}
