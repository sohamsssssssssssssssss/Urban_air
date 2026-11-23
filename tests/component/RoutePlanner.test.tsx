// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import RoutePlanner from "@/components/RoutePlanner";
import RouteResults from "@/components/RouteResults";
import { routeResult } from "../fixtures/route";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const stubRoute = (res: Response) => vi.stubGlobal("fetch", vi.fn(async () => res));

describe("RouteResults", () => {
  it("shows labels, duration, distance, estimated PM2.5, CO₂ and a one-line reason, with no axe violations", async () => {
    const { container } = render(<RouteResults result={routeResult} language="en" />);
    const card = screen.getByRole("heading", { name: "Two-wheeler" }).closest("li")!;
    for (const label of ["Cleanest air", "Fastest", "Best balance"]) expect(within(card).getByText(label)).toBeTruthy();
    expect(card.textContent).toContain("21 min");
    expect(card.textContent).toContain("19.1 km");
    expect(card.textContent).toContain("7.9 µg");
    expect(card.textContent).toContain("Est. CO₂");
    expect(card.textContent).toContain("Lowest estimated PM2.5 inhaled (7.9 µg) and the quickest (21 min).");
    expect((await axe(container)).violations).toEqual([]);
  });

  it("never presents exposure as measured, and lists every alternative with its road-data status", () => {
    const { container } = render(<RouteResults result={routeResult} language="en" />);
    expect(screen.getByText(/estimated from the nearest monitor's last 24 hours, not measured on the route/)).toBeTruthy();
    expect(screen.getByText(/Uses Worli, Mumbai - MPCB's last-24 h pattern/)).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(1 + 8);
    expect(screen.getByText("main-road adjustment applied (1% of route)")).toBeTruthy();
    expect(screen.getAllByText("not applied (OSRM gave no road class)").length).toBe(7);
    expect(screen.getByText("Two-wheelers use the car road network and car travel times.")).toBeTruthy();
    expect(screen.getByText(/Places and routes © OpenStreetMap contributors/)).toBeTruthy();
    expect(container.textContent).not.toMatch(/\bmeasured (exposure|PM)/i);
  });

  it("offers 'Log this trip' per route when a handler is given, and hands over mode, distance and air level", async () => {
    const onLogTrip = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<RouteResults result={routeResult} language="en" onLogTrip={onLogTrip} />);
    expect(screen.getAllByRole("button", { name: /^Log this trip: / })).toHaveLength(8);
    await user.click(screen.getByRole("button", { name: "Log this trip: cycling, route 2" }));
    expect(onLogTrip).toHaveBeenCalledWith({ mode: "cycle", km: 19.1, ambientUgm3: 70 });
    expect((await axe(container)).violations).toEqual([]);
  });

  it("shows no log buttons without a handler", () => {
    render(<RouteResults result={routeResult} language="en" />);
    expect(screen.queryByRole("button", { name: /Log this trip/ })).toBeNull();
  });

  it("flags approximate air data and explains computed reasons", () => {
    render(<RouteResults result={{ ...routeResult, approximate: true, unavailableModes: ["walk"] }} language="en" />);
    expect(screen.getByText(/Approximate: no reference monitor within 25 km/)).toBeTruthy();
    expect(screen.getByText("Reasons written from the computed numbers (AI busy (quota)).")).toBeTruthy();
    expect(screen.getByText("No route found for: walking.")).toBeTruthy();
  });

  it("renders in Hindi with no axe violations", async () => {
    const { container } = render(<RouteResults result={routeResult} language="hi" />);
    expect(screen.getByText("सबसे साफ़ हवा")).toBeTruthy();
    expect(screen.getAllByText("अनुमानित PM2.5 सांस में").length).toBeGreaterThan(0); // card label + table header
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe("RoutePlanner", () => {
  it("has labelled inputs and no axe violations", async () => {
    const { container } = render(<RoutePlanner language="en" />);
    for (const label of ["From", "To", "Leave at (optional)"]) expect(screen.getByLabelText(label)).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("sends both places and the chosen language, then shows the results", async () => {
    const fetchMock = vi.fn(async () => Response.json(routeResult));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const { container } = render(<RoutePlanner language="en" />);
    await user.type(screen.getByLabelText("From"), "Colaba Causeway, Mumbai");
    await user.type(screen.getByLabelText("To"), "Bandra Kurla Complex, Mumbai");
    await user.click(screen.getByRole("button", { name: "Find routes" }));
    await screen.findByText("Cleanest air");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/route");
    expect(JSON.parse(init.body as string)).toEqual({ origin: { query: "Colaba Causeway, Mumbai" }, destination: { query: "Bandra Kurla Complex, Mumbai" }, language: "en" });
    expect((await axe(container)).violations).toEqual([]);
  });

  it("includes the departure time when one is chosen", async () => {
    const fetchMock = vi.fn(async () => Response.json(routeResult));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<RoutePlanner language="en" />);
    await user.type(screen.getByLabelText("From"), "Colaba");
    await user.type(screen.getByLabelText("To"), "Bandra");
    await user.type(screen.getByLabelText("Leave at (optional)"), "08:30");
    await user.click(screen.getByRole("button", { name: "Find routes" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const sent = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.departAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/);
  });

  it.each([
    ["PLACE_NOT_FOUND", 404, "We couldn't find that place. Try a more specific name or add the city."],
    ["GEOCODE_UNAVAILABLE", 503, "Place search is unavailable right now. Please try again shortly."],
    ["ROUTE_UNAVAILABLE", 503, "No route could be found between these places right now."],
  ])("shows a readable alert for %s", async (code, status, message) => {
    stubRoute(Response.json({ error: { code, message: "server text" } }, { status }));
    const user = userEvent.setup();
    render(<RoutePlanner language="en" />);
    await user.type(screen.getByLabelText("From"), "Nowhere");
    await user.type(screen.getByLabelText("To"), "Elsewhere");
    await user.click(screen.getByRole("button", { name: "Find routes" }));
    expect((await screen.findByRole("alert")).textContent).toBe(message);
  });

  it("localises the form and the error to Hindi, and survives a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network"); }));
    const user = userEvent.setup();
    render(<RoutePlanner language="hi" />);
    await user.type(screen.getByLabelText("कहाँ से"), "कोलाबा");
    await user.type(screen.getByLabelText("कहाँ तक"), "बांद्रा");
    await user.click(screen.getByRole("button", { name: "रास्ते खोजें" }));
    expect((await screen.findByRole("alert")).textContent).toContain("SmogSense से संपर्क नहीं हो पाया");
  });
});
