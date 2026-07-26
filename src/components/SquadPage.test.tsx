import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SquadPage } from "./SquadPage";

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

describe("SquadPage", () => {
  it("confirms and persists a preliminary retention list", () => {
    const view = render(<SquadPage franchiseId="mi" />);
    const playerRow = view.getByText("Rohit Sharma").closest("tr")!;
    const decision = within(playerRow).getByRole("button");

    fireEvent.click(decision);
    fireEvent.click(decision);
    fireEvent.click(view.getByText("Submit preliminary list"));

    expect(view.getByRole("dialog")).toBeTruthy();
    fireEvent.click(view.getByText("Confirm submission"));

    expect(view.getByText("Preliminary list submitted")).toBeTruthy();
    const saved = JSON.parse(
      window.localStorage.getItem("gg-retention-submission-mi")!,
    );
    expect(saved.releasedPlayerIds).toContain("mi-rohit-sharma");
  });
});
