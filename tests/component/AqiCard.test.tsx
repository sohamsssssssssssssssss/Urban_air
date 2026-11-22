// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import AqiCard from "@/components/AqiCard";
import { snapshot } from "../fixtures/data";

afterEach(cleanup);

describe("AqiCard", () => {
  it("shows AQI, category as text, station, time and pollutants, with no axe violations", async () => {
    const { container } = render(<AqiCard state={{ status: "ready", snapshot }} />);
    expect(container.querySelector(".text-5xl")?.textContent).toBe("AQI 374");
    expect(screen.getByText("Very Poor")).toBeTruthy();
    expect(screen.getByText(/Anand Vihar, Delhi · measured 22 Nov, 16:30 IST · source OpenAQ/)).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "PM2.5" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Sub-index" })).toBeTruthy();
    expect(container.querySelector("[aria-live='polite']")).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("shows CPCB sub-indices without a concentration column, in Hindi", async () => {
    const cpcb = { ...snapshot, source: "CPCB" as const, pollutants: {}, subIndices: { pm25: 205, pm10: 127 }, aqi: 205, category: "Poor" as const };
    const { container } = render(<AqiCard state={{ status: "ready", snapshot: cpcb }} language="hi" />);
    expect(screen.getByText("खराब")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "अभी की हवा" })).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: /सांद्रता/ })).toBeNull();
    expect(screen.getByRole("cell", { name: "205" })).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("warns about stale readings", () => {
    render(<AqiCard state={{ status: "ready", snapshot: { ...snapshot, stale: true } }} />);
    expect(screen.getByText(/more than 3 hours old/)).toBeTruthy();
  });

  it("shows an explicit unavailable state instead of guessed values", async () => {
    const { container } = render(<AqiCard state={{ status: "unavailable", message: "No station answered." }} />);
    expect(screen.getByRole("alert").textContent).toContain("Live data unavailable");
    expect(screen.queryByText(/\d{2,}/)).toBeNull();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("marks the region busy while loading", () => {
    const { container } = render(<AqiCard state={{ status: "loading" }} />);
    expect(container.querySelector("[aria-busy='true']")).toBeTruthy();
  });
});
