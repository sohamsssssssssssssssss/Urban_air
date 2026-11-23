// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import TodayLine from "@/features/today/TodayLine";
import { profile, snapshot } from "../fixtures/data";

afterEach(cleanup);

describe("TodayLine", () => {
  it("shows the computed sentence with a polite live region and no axe violations", async () => {
    const { container } = render(<TodayLine snapshot={snapshot} profile={profile} language="en" />);
    expect(screen.getByRole("heading", { level: 2, name: "Today in one line" })).toBeTruthy();
    const line = container.querySelector("[aria-live='polite']")!;
    expect(line.textContent).toContain("Wear a close-fitted N95 when you go out.");
    expect(screen.getByText("Written from the live data.")).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });
  it("prefers Gemini's wording and says so", () => {
    render(<TodayLine snapshot={snapshot} profile={profile} language="en" aiLine="Go out 13:00–17:00 and wear an N95." />);
    expect(screen.getByText("Go out 13:00–17:00 and wear an N95.")).toBeTruthy();
    expect(screen.getByText(/Reworded by Gemini/)).toBeTruthy();
  });
  it("renders in Hindi with no axe violations", async () => {
    const { container } = render(<TodayLine snapshot={snapshot} profile={profile} language="hi" />);
    expect(screen.getByRole("heading", { name: "आज एक पंक्ति में" })).toBeTruthy();
    expect(container.textContent).toContain("N95 मास्क");
    expect((await axe(container)).violations).toEqual([]);
  });
});
