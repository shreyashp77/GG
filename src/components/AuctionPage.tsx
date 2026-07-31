import { useMemo, useState } from "react";
import type {
  AuctionBidderState,
  AuctionLot,
  AuctionState,
  CareerSave,
  FranchiseId,
} from "../domain/models";
import { franchises } from "../data/franchises";
import { officialTeamTotals, players } from "../data/squads";
import {
  activeLot,
  canBid,
  closeCurrentLot,
  createAuctionState,
  nextBidAmount,
  openNextLot,
  placeBid,
  resolveCurrentLot,
} from "../auction/auctionEngine";
import { fixtureSeed } from "../season/seasonEngine";
import { loadRetentionSubmission } from "../services/retentionStore";
import { saveCareer } from "../services/careerStore";
import { TeamBadge } from "./TeamBadge";

function money(lakhs: number): string {
  return `₹${(lakhs / 100).toFixed(2)}cr`;
}

function initialAuctionState(career: CareerSave): AuctionState | null {
  const submission = loadRetentionSubmission(career.franchiseId);
  if (!submission) return null;

  const released = new Set(submission.releasedPlayerIds);
  const releasedPlayers = players.filter((player) => released.has(player.id));
  const lots: AuctionLot[] = releasedPlayers.map((player) => ({
    id: `auction-${career.season}-${player.id}`,
    playerId: player.id,
    basePriceLakhs: 30,
    overseas: player.overseas,
    status: "pending",
    soldTo: null,
    soldPriceLakhs: null,
  }));
  const bidders: AuctionBidderState[] = franchises.map((franchise) => {
    const teamPlayers = players.filter((player) => player.franchiseId === franchise.id);
    const releasedValue = franchise.id === career.franchiseId
      ? releasedPlayers.reduce((sum, player) => sum + player.salaryLakhs, 0)
      : 0;
    const activePlayers = teamPlayers.filter(
      (player) => franchise.id !== career.franchiseId || !released.has(player.id),
    );
    return {
      franchiseId: franchise.id,
      purseLakhs: officialTeamTotals[franchise.id].purseLakhs + releasedValue,
      playerIds: activePlayers.map((player) => player.id),
      overseasCount: activePlayers.filter((player) => player.overseas).length,
    };
  });

  return createAuctionState(career.season, career.seed, lots, bidders);
}

function maxBidsFor(state: AuctionState, lot: AuctionLot): Partial<Record<FranchiseId, number>> {
  return Object.fromEntries(
    state.bidders.map((bidder) => {
      const budget = bidder.purseLakhs;
      const appetite = 100 + fixtureSeed(state.seed, lot.id + bidder.franchiseId) % 500;
      return [
        bidder.franchiseId,
        Math.min(budget, lot.basePriceLakhs + appetite),
      ];
    }),
  ) as Partial<Record<FranchiseId, number>>;
}

export function AuctionPage({
  career,
  onCareerUpdated,
}: {
  career: CareerSave;
  onCareerUpdated: (career: CareerSave) => void;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const state = career.auctionState;
  const fallbackState = useMemo(() => initialAuctionState(career), [career]);
  const visibleState = state ?? fallbackState;
  const lot = visibleState ? activeLot(visibleState) : null;
  const userBidder = visibleState?.bidders.find(
    (bidder) => bidder.franchiseId === career.franchiseId,
  );
  const lotPlayer = lot ? players.find((player) => player.id === lot.playerId) : null;

  async function persistAuction(next: AuctionState): Promise<void> {
    const updated = { ...career, auctionState: next };
    await saveCareer(updated);
    onCareerUpdated(updated);
  }

  async function prepareAuction(): Promise<void> {
    if (career.auctionState || !fallbackState) return;
    if (!fallbackState.lots.length) {
      setError("Release at least one player before preparing the auction.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      await persistAuction(fallbackState);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save auction state");
    } finally {
      setWorking(false);
    }
  }

  async function updateAuction(update: (current: AuctionState) => AuctionState): Promise<void> {
    if (!visibleState || working) return;
    setWorking(true);
    setError("");
    try {
      await persistAuction(update(visibleState));
    } catch (auctionError) {
      setError(auctionError instanceof Error ? auctionError.message : "Auction action failed");
    } finally {
      setWorking(false);
    }
  }

  if (!loadRetentionSubmission(career.franchiseId) && !state) {
    return (
      <section className="auction-page placeholder-page">
        <p className="eyebrow">IPL {career.season} auction</p>
        <h1>Submit retentions first</h1>
        <p>Your released players become the first auction lots after the preliminary retention list is submitted.</p>
      </section>
    );
  }

  if (!visibleState) {
    return (
      <section className="auction-page placeholder-page">
        <p className="eyebrow">IPL {career.season} auction</p>
        <h1>No auction lots yet</h1>
        <p>Release at least one player in Squad room to create the opening auction set.</p>
      </section>
    );
  }

  const nextBid = lot ? nextBidAmount(visibleState) : null;
  const soldLots = visibleState.lots.filter((item) => item.status === "sold").length;
  const unsoldLots = visibleState.lots.filter((item) => item.status === "unsold").length;

  return (
    <section className="auction-page">
      <div className="auction-heading schedule-heading">
        <div>
          <p className="eyebrow">IPL {career.season} auction · Vertical slice</p>
          <h1>Player auction</h1>
          <p>Run the ascending auction for your released players with deterministic AI competitors.</p>
        </div>
        <div className="auction-summary">
          <strong>{visibleState.lots.length}</strong><span>lots</span>
          <strong>{soldLots}</strong><span>sold</span>
          <strong>{unsoldLots}</strong><span>unsold</span>
        </div>
      </div>

      {error && <p className="match-error">{error}</p>}

      <div className="auction-layout">
        <aside className="auction-lots">
          <div className="fixtures-toolbar"><span>Player set</span><em>{visibleState.status}</em></div>
          {visibleState.lots.map((item, index) => {
            const player = players.find((candidate) => candidate.id === item.playerId)!;
            return (
              <div className={`auction-lot-row ${lot?.id === item.id ? "is-active" : ""}`} key={item.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{player.name.replace(" (T)", "")}</strong><small>{item.overseas ? "Overseas" : "Indian"} · Base {money(item.basePriceLakhs)}</small></div>
                <b>{item.status === "sold" ? money(item.soldPriceLakhs ?? 0) : item.status}</b>
              </div>
            );
          })}
        </aside>

        <div className="auction-main">
          {visibleState.status === "complete" ? (
            <article className="auction-complete-card">
              <p className="eyebrow">Auction complete</p>
              <h2>All lots have been resolved.</h2>
              <p>{soldLots} sold · {unsoldLots} unsold. Squad validation and contract registration will use these results in the next auction slice.</p>
            </article>
          ) : lot && lotPlayer ? (
            <article className="auction-live-card">
              <div className="auction-player-heading">
                <div><span>Current lot</span><h2>{lotPlayer.name.replace(" (T)", "")}</h2><p>{lotPlayer.role} · {lot.overseas ? "Overseas" : "Indian"} · Base price {money(lot.basePriceLakhs)}</p></div>
                <strong>{visibleState.currentBidderId ? money(visibleState.currentBidLakhs) : "No bids"}</strong>
              </div>
              <div className="auction-bid-status">
                <span>{visibleState.currentBidderId ? `Leading: ${visibleState.currentBidderId.toUpperCase()}` : "Awaiting opening bid"}</span>
                {nextBid !== null && <b>Next bid {money(nextBid)}</b>}
              </div>
              <div className="auction-actions">
                <button
                  disabled={working || visibleState.status !== "bidding" || !userBidder || !nextBid || !canUserBid(visibleState, career.franchiseId)}
                  onClick={() => updateAuction((current) => placeBid(current, career.franchiseId))}
                >
                  Bid {nextBid ? money(nextBid) : ""}
                </button>
                <button disabled={working || visibleState.status !== "bidding"} onClick={() => updateAuction((current) => resolveCurrentLot(current, maxBidsFor(current, activeLot(current)!)))}>
                  Let AI resolve lot →
                </button>
                <button disabled={working || visibleState.status !== "bidding"} onClick={() => updateAuction(closeCurrentLot)}>
                  Close lot
                </button>
              </div>
            </article>
          ) : (
            <article className="auction-live-card">
              <p className="eyebrow">Ready for next set</p>
              <h2>Open the next player lot.</h2>
              <button disabled={working} onClick={() => updateAuction(openNextLot)}>Open lot →</button>
            </article>
          )}

          <div className="auction-bidders">
            {visibleState.bidders.map((bidder) => {
              const team = franchises.find((franchise) => franchise.id === bidder.franchiseId)!;
              return (
                <article className={bidder.franchiseId === career.franchiseId ? "is-user" : ""} key={bidder.franchiseId}>
                  <TeamBadge team={team} size="small" />
                  <div><strong>{team.shortName}</strong><span>{money(bidder.purseLakhs)} purse · {bidder.playerIds.length}/25 slots</span></div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {!state && (
        <button className="start-match-button" disabled={working} onClick={prepareAuction}>
          {working ? "Preparing auction…" : "Prepare auction"} <span>→</span>
        </button>
      )}
    </section>
  );
}

function canUserBid(state: AuctionState, franchiseId: FranchiseId): boolean {
  try {
    return canBid(state, franchiseId, nextBidAmount(state));
  } catch {
    return false;
  }
}
