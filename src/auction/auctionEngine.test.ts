import { describe, expect, it } from "vitest";
import type { AuctionBidderState, AuctionLot } from "../domain/models";
import {
  AUCTION_RULES,
  canBid,
  closeCurrentLot,
  createAuctionState,
  openNextLot,
  placeBid,
  resolveCurrentLot,
  validateBidderRoster,
} from "./auctionEngine";

function lot(overseas = false): AuctionLot {
  return {
    id: "lot-1",
    playerId: "player-1",
    basePriceLakhs: 100,
    overseas,
    status: "pending",
    soldTo: null,
    soldPriceLakhs: null,
  };
}

function bidder(
  franchiseId: AuctionBidderState["franchiseId"],
  overrides: Partial<AuctionBidderState> = {},
): AuctionBidderState {
  return {
    franchiseId,
    purseLakhs: 1_000,
    playerIds: Array.from({ length: 17 }, (_, index) => `${franchiseId}-${index}`),
    overseasCount: 4,
    ...overrides,
  };
}

describe("auction engine", () => {
  it("runs deterministic ascending bids and settles to the highest affordable bidder", () => {
    const state = createAuctionState(
      2027,
      42,
      [lot()],
      [bidder("mi"), bidder("csk")],
    );
    const resolved = resolveCurrentLot(state, { mi: 200, csk: 300 });

    expect(resolved.status).toBe("complete");
    expect(resolved.lots[0].status).toBe("sold");
    expect(resolved.lots[0].soldTo).toBe("csk");
    expect(resolved.lots[0].soldPriceLakhs).toBe(200);
    expect(resolved.bidders.find((item) => item.franchiseId === "csk")?.purseLakhs).toBe(800);
    expect(resolved.bidHistory.length).toBeGreaterThan(1);
  });

  it("enforces purse, squad-size, and overseas limits", () => {
    let state = createAuctionState(
      2027,
      42,
      [lot(true)],
      [bidder("mi", { purseLakhs: 90 }), bidder("csk", { playerIds: Array(25).fill("existing") })],
    );
    state = openNextLot(state);

    expect(canBid(state, "mi")).toBe(false);
    expect(canBid(state, "csk")).toBe(false);
    expect(validateBidderRoster(bidder("mi", { playerIds: Array(17).fill("existing") }))).toContain(
      "squad needs at least 18 players",
    );
    expect(AUCTION_RULES.maximumOverseasSquad).toBe(8);
  });

  it("can close an unsold lot without changing bidder rosters", () => {
    const state = openNextLot(
      createAuctionState(2027, 42, [lot()], [bidder("mi", { purseLakhs: 50 })]),
    );
    const closed = closeCurrentLot(state);

    expect(closed.status).toBe("complete");
    expect(closed.lots[0].status).toBe("unsold");
    expect(closed.bidders[0].playerIds).toHaveLength(17);
  });
});
