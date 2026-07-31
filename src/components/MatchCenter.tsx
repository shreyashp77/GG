import { useEffect, useMemo, useState } from "react";
import type {
  CareerSave,
  Fixture,
  FranchiseId,
  Tactics,
} from "../domain/models";
import { franchises } from "../data/franchises";
import { buildEngineTeam } from "../engine/teamBuilder";
import type {
  EngineMatchEvent,
  MatchSimulationResult,
} from "../engine/types";
import { runMatchSimulation } from "../services/matchWorkerClient";
import { loadRetentionSubmission } from "../services/retentionStore";
import { TeamBadge } from "./TeamBadge";

type PlaybackSpeed = "normal" | "fast" | "overs" | "instant";

const defaultTactics: Tactics = {
  battingIntent: "balanced",
  bowlingPlan: "balanced",
  field: "balanced",
};

export function MatchCenter({
  career,
  fixture = null,
  onCompleted,
}: {
  career: CareerSave;
  fixture?: Fixture | null;
  onCompleted?: (result: MatchSimulationResult) => void | Promise<void>;
}) {
  const opponents = franchises.filter((team) => team.id !== career.franchiseId);
  const [opponentId, setOpponentId] = useState<FranchiseId>(opponents[0].id);
  const [tossCall, setTossCall] = useState<"heads" | "tails">("heads");
  const [tossDecision, setTossDecision] = useState<"bat" | "bowl">("bowl");
  const [tactics, setTactics] = useState<Tactics>(defaultTactics);
  const [result, setResult] = useState<MatchSimulationResult | null>(null);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>("normal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [simulationNumber, setSimulationNumber] = useState(0);

  const scheduledFixture = fixture !== null;
  const homeId = fixture?.homeId ?? career.franchiseId;
  const awayId = fixture?.awayId ?? opponentId;
  const homeFranchise = franchises.find((team) => team.id === homeId)!;
  const awayFranchise = franchises.find((team) => team.id === awayId)!;
  const releasedIds =
    loadRetentionSubmission(career.franchiseId)?.releasedPlayerIds ?? [];
  const homeTeam = useMemo(
    () => buildEngineTeam(homeId, homeId === career.franchiseId ? releasedIds : []),
    [career.franchiseId, homeId, releasedIds.join(":")],
  );
  const awayTeam = useMemo(
    () => buildEngineTeam(awayId, awayId === career.franchiseId ? releasedIds : []),
    [awayId, career.franchiseId, releasedIds.join(":")],
  );
  const userTeam = homeId === career.franchiseId ? homeTeam : awayTeam;

  useEffect(() => {
    if (!playing || !result) return;
    if (speed === "instant") {
      setCursor(result.events.length);
      setPlaying(false);
      return;
    }
    const delay = speed === "normal" ? 620 : speed === "fast" ? 95 : 360;
    const timer = window.setInterval(() => {
      setCursor((current) => {
        if (current >= result.events.length) {
          setPlaying(false);
          return current;
        }
        if (speed === "fast") return Math.min(result.events.length, current + 5);
        if (speed === "overs") {
          const currentEvent = result.events[Math.max(0, current - 1)];
          const nextOverEnd = result.events.findIndex(
            (event, index) =>
              index >= current &&
              (event.innings !== currentEvent?.innings ||
                (event.legalBall && event.legalBalls % 6 === 0)),
          );
          return nextOverEnd === -1 ? result.events.length : nextOverEnd + 1;
        }
        return current + 1;
      });
    }, delay);
    return () => window.clearInterval(timer);
  }, [playing, result, speed]);

  async function startMatch() {
    if (userTeam.players.length < 11) {
      setError("Your submitted squad cannot field an XI. Retain at least eleven players.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const seed =
        (career.seed ^
          Date.parse(`${career.currentDate}T12:00:00`) ^
          simulationNumber * 2_654_435_761) >>>
        0;
      const matchResult = await runMatchSimulation({
        fixtureId: fixture?.id ?? `exhibition-${career.franchiseId}-${opponentId}-${career.currentDate}`,
        seed,
        home: homeTeam,
        away: awayTeam,
        userTeamId: career.franchiseId,
        tossCall,
        tossDecision,
        tactics,
      });
      await onCompleted?.(matchResult);
      setResult(matchResult);
      setCursor(0);
      setPlaying(true);
      setSpeed("normal");
      setSimulationNumber((value) => value + 1);
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "Unable to simulate match");
    } finally {
      setLoading(false);
    }
  }

  if (!result) {
    return (
      <section className="match-setup-page">
        <div className="match-page-heading">
          <div>
            <p className="eyebrow">
              {scheduledFixture ? "IPL 2027 · Scheduled fixture" : "Vertical slice 2 · Exhibition"}
            </p>
            <h1>Match centre</h1>
            <p>
              {scheduledFixture
                ? `${homeFranchise.shortName} vs ${awayFranchise.shortName} · ${fixture?.date}`
                : "Set the plan, call the toss and hand the fixture to the deterministic match worker."}
            </p>
          </div>
          <span>Seeded simulation</span>
        </div>

        <div className="match-setup-grid">
          <article className="fixture-builder">
            <div className="matchup-team">
              <TeamBadge team={homeFranchise} size="large" />
              <div>
                <span>{homeId === career.franchiseId ? "Your XI" : "AI XI"}</span>
                <strong>{homeFranchise.name}</strong><small>{homeFranchise.venue}</small>
              </div>
            </div>
            <div className="versus-mark"><i /><strong>VS</strong><i /></div>
            {scheduledFixture ? (
              <div className="opponent-picker"><span>Stage</span><strong>{fixture?.stage.replace("-", " ")}</strong></div>
            ) : (
              <label className="opponent-picker">
                <span>Opponent</span>
                <select
                  value={opponentId}
                  onChange={(event) => setOpponentId(event.target.value as FranchiseId)}
                >
                  {opponents.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="matchup-team is-away">
              <TeamBadge team={awayFranchise} size="large" />
              <div>
                <span>{awayId === career.franchiseId ? "Your XI" : "AI XI"}</span>
                <strong>{awayFranchise.name}</strong><small>Balanced AI tactics</small>
              </div>
            </div>
            <div className="xi-strip">
              <span>Selected XI</span>
              <p>{userTeam.players.map((player) => player.name).join(" · ")}</p>
            </div>
          </article>

          <aside className="tactics-builder">
            <div className="setup-block">
              <span>01 · Toss call</span>
              <Segmented
                options={["heads", "tails"]}
                value={tossCall}
                onChange={(value) => setTossCall(value as "heads" | "tails")}
              />
            </div>
            <div className="setup-block">
              <span>02 · If you win</span>
              <Segmented
                options={["bat", "bowl"]}
                value={tossDecision}
                onChange={(value) => setTossDecision(value as "bat" | "bowl")}
              />
            </div>
            <div className="setup-block">
              <span>03 · Batting intent</span>
              <Segmented
                options={["defensive", "balanced", "attacking"]}
                value={tactics.battingIntent}
                onChange={(value) =>
                  setTactics((current) => ({
                    ...current,
                    battingIntent: value as Tactics["battingIntent"],
                  }))
                }
              />
            </div>
            <div className="setup-block">
              <span>04 · Bowling plan</span>
              <Segmented
                options={["contain", "balanced", "wickets"]}
                value={tactics.bowlingPlan}
                onChange={(value) =>
                  setTactics((current) => ({
                    ...current,
                    bowlingPlan: value as Tactics["bowlingPlan"],
                  }))
                }
              />
            </div>
            <div className="setup-block">
              <span>05 · Field preset</span>
              <Segmented
                options={["defensive", "balanced", "attacking"]}
                value={tactics.field}
                onChange={(value) =>
                  setTactics((current) => ({
                    ...current,
                    field: value as Tactics["field"],
                  }))
                }
              />
            </div>
            {error && <p className="match-error">{error}</p>}
            {userTeam.players.length < 11 && !error && (
              <p className="match-error">Your active squad has fewer than eleven players.</p>
            )}
            <button
              className="start-match-button"
              disabled={loading || userTeam.players.length < 11}
              onClick={startMatch}
            >
              {loading ? "Preparing match…" : "Start match"} <span>→</span>
            </button>
          </aside>
        </div>
      </section>
    );
  }

  const visibleEvents = result.events.slice(0, cursor);
  const currentEvent = visibleEvents.at(-1) ?? null;
  const complete = cursor >= result.events.length;
  const firstBatting = franchises.find((team) => team.id === result.innings[0].battingTeamId)!;
  const secondBatting = franchises.find((team) => team.id === result.innings[1].battingTeamId)!;
  const currentBatting = franchises.find(
    (team) => team.id === (currentEvent?.battingTeamId ?? result.firstBattingTeamId),
  )!;
  const currentInnings = currentEvent?.innings ?? 1;
  const inningsResult = result.innings[currentInnings - 1];
  const displayScore = currentEvent?.score ?? 0;
  const displayWickets = currentEvent?.wickets ?? 0;
  const displayBalls = currentEvent?.legalBalls ?? 0;
  const required =
    currentInnings === 2 && currentEvent
      ? Math.max(0, result.innings[0].runs + 1 - displayScore)
      : null;

  return (
    <section className="match-centre">
      <header className="match-score-header">
        <div className="score-team">
          <TeamBadge team={firstBatting} size="medium" />
          <div><span>{firstBatting.shortName}</span><strong>
            {currentInnings > 1 || complete
              ? `${result.innings[0].runs}/${result.innings[0].wickets}`
              : currentBatting.id === firstBatting.id
                ? `${displayScore}/${displayWickets}`
                : "—"}
          </strong></div>
        </div>
        <div className="match-status">
          <span>{complete ? "Result" : `Innings ${currentInnings}`}</span>
          <strong>{complete ? result.resultText : `${currentBatting.shortName} batting`}</strong>
          <small>
            {franchises.find((team) => team.id === result.tossWinnerId)!.shortName} won the toss and chose to {result.tossDecision}
          </small>
        </div>
        <div className="score-team is-right">
          <div><span>{secondBatting.shortName}</span><strong>
            {currentInnings === 2
              ? `${displayScore}/${displayWickets}`
              : complete
                ? `${result.innings[1].runs}/${result.innings[1].wickets}`
                : "Yet to bat"}
          </strong></div>
          <TeamBadge team={secondBatting} size="medium" />
        </div>
      </header>

      <div className="match-layout">
        <div className="ground-panel">
          <div className="live-ribbon"><i /> {complete ? "Full time" : playing ? "Live" : "Paused"}</div>
          <CricketGround event={currentEvent} />
          <div className="ground-score">
            <div>
              <span>{currentBatting.shortName}</span>
              <strong>{displayScore}/{displayWickets}</strong>
              <small>{Math.floor(displayBalls / 6)}.{displayBalls % 6} overs</small>
            </div>
            {required !== null && (
              <div className="chase-box">
                <span>Need</span><strong>{required}</strong><small>from {120 - displayBalls} balls</small>
              </div>
            )}
          </div>
        </div>

        <aside className="commentary-panel">
          <div className="commentary-heading">
            <span>Commentary</span>
            <em>{visibleEvents.length}/{result.events.length} balls</em>
          </div>
          <div className="commentary-feed">
            {[...visibleEvents].reverse().slice(0, 13).map((event) => (
              <div className={event.wicket ? "is-wicket" : event.runsOffBat >= 4 ? "is-boundary" : ""} key={event.id}>
                <b>{event.over}.{event.ball}</b>
                <p>{event.commentary}</p>
                <strong>
                  {event.wicket
                    ? "W"
                    : event.runsOffBat + event.extras || "·"}
                </strong>
              </div>
            ))}
            {!visibleEvents.length && <p className="waiting-commentary">The players are taking the field…</p>}
          </div>
        </aside>
      </div>

      <div className="playback-bar">
        <button className="play-button" onClick={() => setPlaying((value) => !value)} disabled={complete}>
          {complete ? "✓" : playing ? "Ⅱ" : "▶"}
        </button>
        <div className="playback-progress">
          <i><b style={{ width: `${(cursor / result.events.length) * 100}%` }} /></i>
          <span>{complete ? result.resultText : `Over ${Math.floor(displayBalls / 6)}.${displayBalls % 6}`}</span>
        </div>
        <div className="speed-buttons">
          {(["normal", "fast", "overs", "instant"] as PlaybackSpeed[]).map((value) => (
            <button
              className={speed === value ? "active" : ""}
              key={value}
              onClick={() => {
                setSpeed(value);
                setPlaying(true);
              }}
            >
              {value === "normal" ? "1×" : value === "fast" ? "5×" : value === "overs" ? "Over" : "Result"}
            </button>
          ))}
        </div>
      </div>

      <div className="scorecard-grid">
        {result.innings.map((innings, index) => {
          const team = franchises.find((item) => item.id === innings.battingTeamId)!;
          const inningsComplete = complete || currentInnings > index + 1;
          const inningsStarted = inningsComplete || (currentInnings === index + 1 && cursor > 0);
          const liveScore =
            currentInnings === index + 1
              ? `${displayScore}/${displayWickets}`
              : `${innings.runs}/${innings.wickets}`;
          return (
            <article key={innings.battingTeamId}>
              <div className="scorecard-title">
                <span>{team.name}</span>
                <strong>{inningsStarted ? liveScore : "Yet to bat"}</strong>
              </div>
              {inningsComplete ? (
                <div className="scorecard-table">
                  {innings.batters.slice(0, 6).map((batter) => (
                    <div key={batter.playerId}>
                      <span>{batter.name}<small>{batter.dismissal ?? "not out"}</small></span>
                      <strong>{batter.runs}<small>{batter.balls}</small></strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="scorecard-pending">
                  {inningsStarted ? "Full batting card available at the innings break" : "Waiting for innings"}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="match-footer-actions">
        <button onClick={() => {
          setResult(null);
          setPlaying(false);
          setCursor(0);
        }}>
          New exhibition
        </button>
        {!complete && <button onClick={() => { setSpeed("instant"); setPlaying(true); }}>Simulate result →</button>}
      </div>
    </section>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented-control">
      {options.map((option) => (
        <button
          className={option === value ? "active" : ""}
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function CricketGround({ event }: { event: EngineMatchEvent | null }) {
  const fielders = [
    [50, 14], [72, 20], [84, 38], [82, 66], [67, 80],
    [35, 81], [18, 65], [16, 38], [31, 20], [64, 52],
  ];
  return (
    <svg className="cricket-ground" viewBox="0 0 100 100" role="img" aria-label="Overhead cricket ground">
      <defs>
        <radialGradient id="grass" cx="50%" cy="45%">
          <stop offset="0%" stopColor="#397b57" />
          <stop offset="100%" stopColor="#174c37" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="50" rx="47" ry="43" fill="url(#grass)" stroke="#a5c985" strokeWidth=".7" />
      <ellipse cx="50" cy="50" rx="39" ry="35" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth=".3" />
      <rect x="46" y="34" width="8" height="32" rx="1" fill="#c9aa78" />
      <line x1="46" y1="39" x2="54" y2="39" stroke="#fff" strokeWidth=".5" />
      <line x1="46" y1="61" x2="54" y2="61" stroke="#fff" strokeWidth=".5" />
      {fielders.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="1.15" fill="#e9f0eb" />)}
      <circle cx="50" cy="59" r="1.4" fill="#d8ff63" />
      <circle cx="50" cy="41" r="1.25" fill="#ffcf57" />
      {event?.shot && (
        <>
          <line
            x1="50"
            y1="59"
            x2={event.shot.x}
            y2={event.shot.y}
            stroke="#ff6b52"
            strokeWidth=".65"
            strokeDasharray="1.4 1.2"
          />
          <circle cx={event.shot.x} cy={event.shot.y} r="1.15" fill="#ff6047" />
        </>
      )}
      {!event?.shot && <circle cx="50" cy="49" r=".8" fill="#ff6047" />}
    </svg>
  );
}
