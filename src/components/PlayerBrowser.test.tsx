import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlayerBrowser } from "./PlayerBrowser";

afterEach(cleanup);

describe("PlayerBrowser", () => {
  it("keeps contract and rating values in their own table columns", () => {
    const view = render(<PlayerBrowser initialTeam="mi" />);
    const row = view.getByText("Jasprit Bumrah").closest("tr");
    expect(row).not.toBeNull();

    const cells = row!.querySelectorAll("td");
    expect(cells).toHaveLength(6);
    expect(cells[0].textContent).toContain("Jasprit Bumrah");
    expect(cells[1].textContent).toContain("MI");
    expect(cells[2].textContent).toBe("Bowler");
    expect(cells[3].textContent).toBe("India");
    expect(cells[4].textContent).toBe("₹18.00cr");
    expect(cells[5].textContent).toMatch(/^\d+$/);
  });
});
