import type {
  AuctionBidderState,
  AuctionLot,
  AuctionState,
  FranchiseId,
} from "../domain/models";

export const AUCTION_RULES = {
  purseLakhs: 12_500,
  minimumSquadSize: 18,
  maximumSquadSize: 25,
  maximumOverseasSquad: 8,
  maximumOverseasXI: 4,
} as const;

export function createAuctionState(
  season: number,
  seed: number,
  lots: AuctionLot[],
  bidders: AuctionBidderState[],
): AuctionState {
  return {
    season,
    seed,
    currentLotIndex: null,
    currentBidLakhs: 0,
    currentBidderId: null,
    status: "ready",
    lots: lots.map((lot) => ({ ...lot })),
    bidders: bidders.map((bidder) => ({
      ...bidder,
      playerIds: [...bidder.playerIds],
    })),
    bidHistory: [],
  };
}

export function bidIncrement(currentBidLakhs: number): number {
  if (currentBidLakhs < 1_000) return 25;
  if (currentBidLakhs < 2_000) return 50;
  return 100;
}

export function nextBidAmount(state: AuctionState): number {
  const lot = activeLot(state);
  if (!lot) throw new Error("No auction lot is open");
  return state.currentBidderId === null
    ? lot.basePriceLakhs
    : state.currentBidLakhs + bidIncrement(state.currentBidLakhs);
}

export function activeLot(state: AuctionState): AuctionLot | null {
  return state.currentLotIndex === null
    ? null
    : state.lots[state.currentLotIndex] ?? null;
}

export function openNextLot(state: AuctionState): AuctionState {
  if (state.status === "complete") return state;
  const index = state.lots.findIndex((lot) => lot.status === "pending");
  if (index === -1) {
    return {
      ...state,
      currentLotIndex: null,
      currentBidLakhs: 0,
      currentBidderId: null,
      status: "complete",
    };
  }

  return {
    ...state,
    currentLotIndex: index,
    currentBidLakhs: 0,
    currentBidderId: null,
    status: "bidding",
  };
}

function bidderFor(
  state: AuctionState,
  bidderId: FranchiseId,
): AuctionBidderState {
  const bidder = state.bidders.find((item) => item.franchiseId === bidderId);
  if (!bidder) throw new Error(`Unknown auction bidder: ${bidderId}`);
  return bidder;
}

export function canBid(
  state: AuctionState,
  bidderId: FranchiseId,
  amountLakhs = nextBidAmount(state),
): boolean {
  const lot = activeLot(state);
  if (!lot || state.status !== "bidding") return false;
  const bidder = bidderFor(state, bidderId);
  if (state.currentBidderId === bidderId) return false;
  if (bidder.purseLakhs < amountLakhs) return false;
  if (bidder.playerIds.length >= AUCTION_RULES.maximumSquadSize) return false;
  if (lot.overseas && bidder.overseasCount >= AUCTION_RULES.maximumOverseasSquad) {
    return false;
  }
  return true;
}

export function placeBid(
  state: AuctionState,
  bidderId: FranchiseId,
): AuctionState {
  const amountLakhs = nextBidAmount(state);
  if (!canBid(state, bidderId, amountLakhs)) {
    throw new Error(`${bidderId} cannot place a ₹${amountLakhs / 100}cr bid`);
  }

  const lot = activeLot(state)!;
  return {
    ...state,
    currentBidLakhs: amountLakhs,
    currentBidderId: bidderId,
    bidHistory: [
      ...state.bidHistory,
      { lotId: lot.id, bidderId, amountLakhs },
    ],
  };
}

function closeLot(state: AuctionState): AuctionState {
  const lot = activeLot(state);
  if (!lot) throw new Error("No auction lot is open");

  const sold = state.currentBidderId !== null;
  const updatedLots = state.lots.map((item, index) =>
    index === state.currentLotIndex
      ? {
          ...item,
          status: sold ? ("sold" as const) : ("unsold" as const),
          soldTo: sold ? state.currentBidderId : null,
          soldPriceLakhs: sold ? state.currentBidLakhs : null,
        }
      : item,
  );
  let updatedBidders = state.bidders;
  if (sold) {
    updatedBidders = state.bidders.map((bidder) =>
      bidder.franchiseId === state.currentBidderId
        ? {
            ...bidder,
            purseLakhs: bidder.purseLakhs - state.currentBidLakhs,
            playerIds: [...bidder.playerIds, lot.playerId],
            overseasCount: bidder.overseasCount + (lot.overseas ? 1 : 0),
          }
        : bidder,
    );
  }

  return openNextLot({
    ...state,
    lots: updatedLots,
    bidders: updatedBidders,
    currentLotIndex: null,
    currentBidLakhs: 0,
    currentBidderId: null,
    status: "ready",
  });
}

export function closeCurrentLot(state: AuctionState): AuctionState {
  if (state.status !== "bidding") throw new Error("No lot is currently being bid on");
  return closeLot(state);
}

export function resolveCurrentLot(
  state: AuctionState,
  maximumBids: Partial<Record<FranchiseId, number>>,
): AuctionState {
  let resolved = state.status === "ready" ? openNextLot(state) : state;
  if (resolved.status !== "bidding") return resolved;

  for (let round = 0; round < resolved.bidders.length * 100; round += 1) {
    const amount = nextBidAmount(resolved);
    const candidates = resolved.bidders
      .filter((bidder) => bidder.franchiseId !== resolved.currentBidderId)
      .filter((bidder) => (maximumBids[bidder.franchiseId] ?? 0) >= amount)
      .filter((bidder) => canBid(resolved, bidder.franchiseId, amount))
      .sort(
        (left, right) =>
          (maximumBids[right.franchiseId] ?? 0) -
            (maximumBids[left.franchiseId] ?? 0) ||
          left.franchiseId.localeCompare(right.franchiseId),
      );
    if (!candidates.length) return closeLot(resolved);
    resolved = placeBid(resolved, candidates[0].franchiseId);
  }

  throw new Error("Auction bidding exceeded the safety limit");
}

export function validateBidderRoster(bidder: AuctionBidderState): string[] {
  const errors: string[] = [];
  if (bidder.purseLakhs < 0) errors.push("purse cannot be negative");
  if (bidder.playerIds.length < AUCTION_RULES.minimumSquadSize) {
    errors.push(`squad needs at least ${AUCTION_RULES.minimumSquadSize} players`);
  }
  if (bidder.playerIds.length > AUCTION_RULES.maximumSquadSize) {
    errors.push(`squad cannot exceed ${AUCTION_RULES.maximumSquadSize} players`);
  }
  if (bidder.overseasCount > AUCTION_RULES.maximumOverseasSquad) {
    errors.push(`squad cannot exceed ${AUCTION_RULES.maximumOverseasSquad} overseas players`);
  }
  return errors;
}

export function completeAuction(state: AuctionState): AuctionState {
  if (state.status !== "complete") throw new Error("Auction lots are not complete");
  const invalid = state.bidders.find((bidder) => validateBidderRoster(bidder).length);
  if (invalid) {
    throw new Error(
      `${invalid.franchiseId} has an invalid roster: ${validateBidderRoster(invalid).join(", ")}`,
    );
  }
  return state;
}
