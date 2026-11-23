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
    expect(container.querySelector("[data-aqi-value]")?.textContent).toBe("AQI 374");
    expect(screen.getByText("Very Poor")).toBeTruthy();
    expect(screen.getByText("AQI (24h, official method)")).toBeTruthy();
    expect(screen.getByText("Now (last hour) PM2.5")).toBeTruthy();
    expect(screen.getByText(/Anand Vihar, Delhi · measured 22 Nov, 16:30 IST · source OpenAQ/)).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "PM2.5" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Sub-index (24h)" })).toBeTruthy();
    expect(container.querySelector("[aria-live='polite']")).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("shows CPCB sub-indices without a concentration column, in Hindi", async () => {
    const cpcb = { ...snapshot, source: "CPCB" as const, pollutants: {}, subIndices: { pm25: 205, pm10: 127 }, aqi: 205, category: "Poor" as const };
    const { container } = render(<AqiCard state={{ status: "ready", snapshot: cpcb }} language="hi" />);
    expect(screen.getByText("खराब")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "अभी की हवा" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "पिछला घंटा" })).toBeTruthy();
    expect(screen.getAllByText("CPCB केवल उप-सूचकांक प्रकाशित करता है।").length).toBeGreaterThan(1); // cell text + footnote
    expect(screen.getByRole("cell", { name: "205" })).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("labels columns by time basis and shows a unit on every value, with CO in mg/m³", async () => {
    const withCo = { ...snapshot, pollutants: { ...snapshot.pollutants, co: 790.5 }, subIndices: { ...snapshot.subIndices, co: 40 } };
    const { container } = render(<AqiCard state={{ status: "ready", snapshot: withCo }} />);
    expect(screen.getByRole("columnheader", { name: "Last hour" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Sub-index (24h)" })).toBeTruthy();
    const row = (name: string) => screen.getByRole("rowheader", { name }).closest("tr")!;
    expect(row("PM2.5").textContent).toContain("182 µg/m³");
    expect(row("CO").textContent).toContain("0.79 mg/m³");
    expect(screen.queryByText("n/a")).toBeNull();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("explains n/a instead of showing a dash (CPCB publishes sub-index only)", async () => {
    const cpcb = { ...snapshot, source: "CPCB" as const, pollutants: {}, subIndices: { pm25: 155, pm10: 90 } };
    const { container } = render(<AqiCard state={{ status: "ready", snapshot: cpcb }} />);
    const cell = screen.getByRole("rowheader", { name: "PM2.5" }).closest("tr")!.querySelectorAll("td")[0]!;
    expect(cell.textContent).toContain("CPCB publishes sub-index only.");
    expect(cell.querySelector("[title='CPCB publishes sub-index only.']")).toBeTruthy();
    expect(cell.querySelector("[aria-hidden='true']")?.textContent).toBe("n/a");
    expect(container.textContent).not.toContain("—");
    expect((await axe(container)).violations).toEqual([]);
  });

  it("warns about stale readings", () => {
    render(<AqiCard state={{ status: "ready", snapshot: { ...snapshot, stale: true } }} />);
    expect(screen.getByText(/more than 3 hours old/)).toBeTruthy();
  });

  it("labels the result provisional when hourly history is incomplete", () => {
    render(<AqiCard state={{ status: "ready", snapshot: { ...snapshot, provisional: true } }} />);
    expect(screen.getByText("Provisional AQI")).toBeTruthy();
    expect(screen.getByText(/Hourly history is incomplete/)).toBeTruthy();
  });

  it("identifies a low-cost sensor in the card", () => {
    render(<AqiCard state={{ status: "ready", snapshot: { ...snapshot, sensorType: "low-cost" } }} />);
    expect(screen.getByText("Low-cost sensor reading.")).toBeTruthy();
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
