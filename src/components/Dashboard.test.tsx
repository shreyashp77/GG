import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CareerSave } from "../domain/models";
import {
  DATABASE_VERSION,
  RULESET_VERSION,
  SAVE_SCHEMA_VERSION,
} from "../domain/models";
import { Dashboard } from "./Dashboard";

const career: CareerSave = {
  id: "primary",
  schemaVersion: SAVE_SCHEMA_VERSION,
  databaseVersion: DATABASE_VERSION,
  rulesetVersion: RULESET_VERSION,
  coachName: "Test Coach",
  franchiseId: "mi",
  season: 2027,
  currentDate: "2026-07-07",
  seed: 42,
  createdAt: "2026-01-01T00:00:00.000Z",
  seasonState: {
    season: 2027,
    scheduleSeed: 42 ^ 2027,
    completedFixtures: [],
    championId: null,
  },
  seasonHistory: [],
};

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
});

afterEach(cleanup);

describe("Dashboard squad finances", () => {
  it("adds submitted releases back to the available purse", () => {
    window.localStorage.setItem(
      "gg-retention-submission-mi",
      JSON.stringify({
        franchiseId: "mi",
        submittedAt: "2026-06-12T10:00:00.000Z",
        retainedPlayerIds: ["mi-jasprit-bumrah"],
        releasedPlayerIds: ["mi-rohit-sharma"],
      }),
    );

    const view = render(<Dashboard career={career} openSquad={() => undefined} />);

    expect(view.getByText("₹19.05cr")).toBeTruthy();
    expect(view.getByText("Committed ₹105.95cr")).toBeTruthy();
    expect(view.getByText("19/25 slots")).toBeTruthy();
    expect(view.getByText("July 2026")).toBeTruthy();
    expect(view.getByText("Your preliminary retention list is submitted with 19 players.")).toBeTruthy();
    expect(view.getByText("Retention list submitted")).toBeTruthy();
    expect(
      view.getByText((_, element) =>
        element?.tagName === "H2" &&
        element.textContent?.includes("1 released") === true,
      ),
    ).toBeTruthy();
  });
});
