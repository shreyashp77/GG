import { useMemo, useState } from "react";
import type { CareerSave, Fixture } from "../domain/models";
import { franchises } from "../data/franchises";
import { generateSeasonSchedule } from "../season/schedule";
import { MatchCenter } from "./MatchCenter";
import { TeamBadge } from "./TeamBadge";
import {
  calculateStandings,
  completedFixtureFromMatch,
} from "../season/standings";
import {
  simulatePlayoffs,
  simulateUnplayedAIFixtures,
} from "../season/seasonEngine";
import { resolvePlayoffFixtures } from "../season/playoffs";
import type { MatchSimulationResult } from "../engine/types";
import { saveCareer } from "../services/careerStore";

export function SeasonPage({
  career,
  onCareerUpdated,
}: {
  career: CareerSave;
  onCareerUpdated: (career: CareerSave) => void;
}) {
  const [tab, setTab] = useState<"schedule" | "standings" | "match">("schedule");
  const [filter, setFilter] = useState<"mine" | "all">("mine");
  const [activeFixture, setActiveFixture] = useState<Fixture | null>(null);
  const [simulatingAI, setSimulatingAI] = useState(false);
  const [simulatingPlayoffs, setSimulatingPlayoffs] = useState(false);
  const [seasonError, setSeasonError] = useState("");
  const schedule = useMemo(
    () => generateSeasonSchedule(career.seasonState.scheduleSeed),
    [career.seasonState.scheduleSeed],
  );
  const completedById = useMemo(
    () => new Map(career.seasonState.completedFixtures.map((result) => [result.fixtureId, result])),
    [career.seasonState.completedFixtures],
  );
  const leagueFixtureIds = useMemo(
    () => new Set(schedule.leagueFixtures.map((fixture) => fixture.id)),
    [schedule.leagueFixtures],
  );
  const fixtures =
    filter === "mine"
      ? schedule.leagueFixtures.filter(
          (fixture) =>
            fixture.homeId === career.franchiseId ||
            fixture.awayId === career.franchiseId,
        )
      : schedule.leagueFixtures;
  const standings = useMemo(
    () => calculateStandings(
      career.seasonState.completedFixtures.filter((result) => leagueFixtureIds.has(result.fixtureId)),
    ),
    [career.seasonState.completedFixtures, leagueFixtureIds],
  );
  const leagueComplete = schedule.leagueFixtures.every((fixture) => completedById.has(fixture.id));
  const playoffFixtures = useMemo(
    () => leagueComplete
      ? resolvePlayoffFixtures(schedule, standings, career.seasonState.completedFixtures)
      : [],
    [career.seasonState.completedFixtures, leagueComplete, schedule, standings],
  );
  const aiFixturesRemaining = useMemo(
    () => schedule.leagueFixtures.filter(
      (fixture) =>
        !completedById.has(fixture.id) &&
        fixture.homeId !== career.franchiseId &&
        fixture.awayId !== career.franchiseId,
    ).length,
    [career.franchiseId, completedById, schedule.leagueFixtures],
  );

  async function simulateAIFixtures(): Promise<void> {
    if (simulatingAI || aiFixturesRemaining === 0) return;
    setSimulatingAI(true);
    setSeasonError("");
    try {
      const simulated = simulateUnplayedAIFixtures(
        schedule.leagueFixtures,
        career.seasonState.completedFixtures,
        career.seasonState.scheduleSeed,
        career.franchiseId,
      );
      if (!simulated.length) return;

      const updated: CareerSave = {
        ...career,
        seasonState: {
          ...career.seasonState,
          completedFixtures: [
            ...career.seasonState.completedFixtures,
            ...simulated,
          ],
        },
      };
      await saveCareer(updated);
      onCareerUpdated(updated);
    } catch (error) {
      setSeasonError(error instanceof Error ? error.message : "Unable to simulate league fixtures");
    } finally {
      setSimulatingAI(false);
    }
  }

  async function simulatePlayoffSeries(): Promise<void> {
    if (
      simulatingPlayoffs ||
      !leagueComplete ||
      career.seasonState.championId !== null
    ) return;

    setSimulatingPlayoffs(true);
    setSeasonError("");
    try {
      const series = simulatePlayoffs(
        schedule,
        standings,
        career.seasonState.completedFixtures,
        career.seasonState.scheduleSeed,
      );
      if (!series.results.length || !series.championId) {
        throw new Error("Unable to resolve the playoff bracket");
      }

      const updated: CareerSave = {
        ...career,
        seasonState: {
          ...career.seasonState,
          completedFixtures: [
            ...career.seasonState.completedFixtures,
            ...series.results,
          ],
          championId: series.championId,
        },
      };
      await saveCareer(updated);
      onCareerUpdated(updated);
    } catch (error) {
      setSeasonError(error instanceof Error ? error.message : "Unable to simulate playoffs");
    } finally {
      setSimulatingPlayoffs(false);
    }
  }

  async function recordFixtureResult(
    fixture: Fixture,
    result: MatchSimulationResult,
  ): Promise<void> {
    if (completedById.has(fixture.id)) return;

    const completedFixture = completedFixtureFromMatch(fixture, result);
    const updated: CareerSave = {
      ...career,
      seasonState: {
        ...career.seasonState,
        completedFixtures: [
          ...career.seasonState.completedFixtures,
          completedFixture,
        ],
      },
    };
    await saveCareer(updated);
    onCareerUpdated(updated);
  }

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
        <MatchCenter
          career={career}
          fixture={activeFixture}
          onCompleted={
            activeFixture
              ? (result) => recordFixtureResult(activeFixture, result)
              : undefined
          }
        />
      ) : tab === "standings" ? (
        <section className="standings-page">
          <div className="schedule-heading">
            <div>
              <p className="eyebrow">League table</p>
              <h1>Standings</h1>
              <p>Completed scheduled matches update points, wins, losses, and net run rate here.</p>
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
          <div className="preseason-table-note">
            {career.seasonState.completedFixtures.length
              ? `${career.seasonState.completedFixtures.length} fixture${career.seasonState.completedFixtures.length === 1 ? "" : "s"} recorded`
              : "Preseason · no results recorded"}
          </div>
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
            <button
              className="schedule-simulate-button"
              disabled={simulatingAI || aiFixturesRemaining === 0}
              onClick={simulateAIFixtures}
            >
              {simulatingAI ? "Simulating…" : aiFixturesRemaining ? `Simulate ${aiFixturesRemaining} AI fixtures` : "AI fixtures simulated"}
              <span>→</span>
            </button>
            {career.seasonState.championId ? (
              <strong className="season-champion">
                Champion: {franchises.find((team) => team.id === career.seasonState.championId)?.shortName}
              </strong>
            ) : leagueComplete ? (
              <button
                className="schedule-simulate-button"
                disabled={simulatingPlayoffs}
                onClick={simulatePlayoffSeries}
              >
                {simulatingPlayoffs ? "Resolving playoffs…" : "Resolve playoffs"}
                <span>→</span>
              </button>
            ) : null}
          </div>

          {seasonError && <p className="match-error">{seasonError}</p>}

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
                      {completedById.has(fixture.id) ? (
                        <span className="fixture-complete">Result recorded</span>
                      ) : fixture.homeId === career.franchiseId || fixture.awayId === career.franchiseId ? (
                        <button
                          onClick={() => {
                            setActiveFixture(fixture);
                            setTab("match");
                          }}
                        >
                          Play match →
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="playoff-panel">
              <div className="playoff-heading">
                <span>Playoffs</span><em>Top four qualify</em>
              </div>
              {schedule.playoffs.map((template, index) => {
                const resolved = playoffFixtures.find((fixture) => fixture.id === template.id);
                const completed = completedById.get(template.id);
                const home = resolved ? franchises.find((team) => team.id === resolved.homeId) : null;
                const away = resolved ? franchises.find((team) => team.id === resolved.awayId) : null;
                return (
                  <div className="playoff-fixture" key={template.id}>
                    <b>{index + 71}</b>
                    <div>
                      <span>{stageLabel(template.stage)}</span>
                      <strong>
                        {home && away
                          ? `${home.shortName} vs ${away.shortName}`
                          : `${template.homeSeed} vs ${template.awaySeed}`}
                      </strong>
                      <small>
                        {completed
                          ? `Result ${completed.homeRuns}/${completed.awayRuns}`
                          : formatDate(template.date)}
                      </small>
                    </div>
                  </div>
                );
              })}
              <div className="playoff-note">
                {!leagueComplete
                  ? "Participants resolve from the live standings once the league stage is complete."
                  : career.seasonState.championId
                    ? "Season complete · champion recorded in the career save."
                    : "The top four are set. Resolve the playoff series to crown a champion."}
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
