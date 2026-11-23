// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import Outlook from "@/features/outlook/Outlook";
import { cleanestWindows, parseForecast } from "@/features/outlook/logic";
import fixture from "../fixtures/live/open-meteo-mumbai.json";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const hours = parseForecast(fixture.hourly);
const outlook = { hours, windows: cleanestWindows(hours), source: "Open-Meteo (CAMS)" };
const location = { lat: 19.07, lon: 72.88, city: "Mumbai" as const };
const stub = (res: () => Response) => vi.stubGlobal("fetch", vi.fn(async () => res()));

describe("Outlook", () => {
  it("labels the forecast as a model, lists three windows, and gives the chart a text alternative, with no axe violations", async () => {
    stub(() => Response.json({ outlook }));
    const { container } = render(<Outlook location={location} language="en" />);
    expect(screen.getByText("Model forecast (CAMS), not a measurement")).toBeTruthy();
    expect(screen.getByText("Loading the forecast…")).toBeTruthy();
    const list = await screen.findByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(list.textContent).toMatch(/µg\/m³ PM2\.5 \(.* by PM2\.5 alone\)/);
    const chart = screen.getByRole("img", { name: "Forecast PM2.5 for the next 48 hours" });
    expect(chart.querySelector("desc")!.textContent).toMatch(/Highest around .* at 98 µg\/m³; lowest around .* at 36 µg\/m³/);
    expect(screen.getByText(/not an official AQI/)).toBeTruthy();
    expect(screen.getByText(/Open-Meteo, from the Copernicus Atmosphere Monitoring Service/)).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("offers every hourly value in a table", async () => {
    stub(() => Response.json({ outlook }));
    const user = userEvent.setup();
    render(<Outlook location={location} language="en" />);
    await screen.findByRole("list");
    await user.click(screen.getByText("Show hourly values"));
    expect(screen.getAllByRole("row")).toHaveLength(1 + 48);
  });

  it("shows a readable error and retries", async () => {
    const responses = [() => Response.json({ error: { code: "FORECAST_UNAVAILABLE", message: "x" } }, { status: 503 }), () => Response.json({ outlook })];
    vi.stubGlobal("fetch", vi.fn(async () => responses.shift()!()));
    const user = userEvent.setup();
    const { container } = render(<Outlook location={location} language="en" />);
    expect((await screen.findByRole("alert")).textContent).toContain("The air-quality forecast is unavailable right now.");
    expect((await axe(container)).violations).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByRole("list")).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("survives a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network"); }));
    render(<Outlook location={location} language="en" />);
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't reach SmogSense");
  });

  it("says when no waking-hour window exists", async () => {
    stub(() => Response.json({ outlook: { ...outlook, windows: [] } }));
    render(<Outlook location={location} language="en" />);
    expect(await screen.findByText("No complete waking-hour windows were found in this forecast.")).toBeTruthy();
  });

  it("renders in Hindi with no axe violations", async () => {
    stub(() => Response.json({ outlook }));
    const { container } = render(<Outlook location={location} language="hi" />);
    await screen.findByRole("list");
    expect(screen.getByText("मॉडल पूर्वानुमान (CAMS), माप नहीं")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "अगले 48 घंटे" })).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });
});
