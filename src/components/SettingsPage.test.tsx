import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CareerSave } from "../domain/models";
import {
  DATABASE_VERSION,
  RULESET_VERSION,
  SAVE_SCHEMA_VERSION,
} from "../domain/models";
import { SettingsPage } from "./SettingsPage";

const career: CareerSave = {
  id: "primary",
  schemaVersion: SAVE_SCHEMA_VERSION,
  databaseVersion: DATABASE_VERSION,
  rulesetVersion: RULESET_VERSION,
  coachName: "Test Coach",
  franchiseId: "mi",
  season: 2027,
  currentDate: "2026-06-08",
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

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.className = "";
});

describe("SettingsPage", () => {
  it("applies and persists interface preferences", () => {
    const view = render(<SettingsPage career={career} />);
    fireEvent.click(view.getByText("Compact tables"));

    expect(document.documentElement.classList.contains("compact-tables")).toBe(true);
    expect(JSON.parse(window.localStorage.getItem("gg-preferences")!).compactTables).toBe(true);
  });

  it("applies dark mode immediately", () => {
    const view = render(<SettingsPage career={career} />);
    fireEvent.click(view.getByText("Dark mode"));

    expect(document.documentElement.classList.contains("dark-mode")).toBe(true);
    expect(JSON.parse(window.localStorage.getItem("gg-preferences")!).darkMode).toBe(true);
  });
});
