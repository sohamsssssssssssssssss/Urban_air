// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import Compare from "@/features/compare/Compare";
import { okSide } from "../fixtures/compare";
import { installMemoryStorage } from "../fixtures/memoryStorage";

const location = { lat: 19.076, lon: 72.8777, city: "Mumbai" as const };
const both = { a: okSide({ label: "Mumbai", aqi: 120 }), b: okSide({ label: "Delhi", aqi: 330, category: "Very Poor", windowMeasured: false, bestWindow: "13:00–17:00", stale: true }) };

beforeEach(() => {
  installMemoryStorage();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const stub = (res: () => Response) => {
  const fetchMock = vi.fn(async () => res());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("Compare", () => {
  it("starts with the user's city and another, with labelled fields and no axe violations", async () => {
    const { container } = render(<Compare location={location} language="en" />);
    expect((screen.getByLabelText("Place 1") as HTMLSelectElement).value).toBe("Mumbai");
    expect((screen.getByLabelText("Place 2") as HTMLSelectElement).value).toBe("Delhi");
    expect((await axe(container)).violations).toEqual([]);
  });

  it("posts both places, then shows the computed sentence and two cards (AQI as text, icon and category)", async () => {
    const fetchMock = stub(() => Response.json(both));
    const user = userEvent.setup();
    const { container } = render(<Compare location={location} language="en" />);
    await user.click(screen.getByRole("button", { name: "Compare" }));
    expect(await screen.findByText("Mumbai has cleaner air right now: AQI 120 against 330 in Delhi (210 points lower).")).toBeTruthy();
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toEqual({ a: { lat: 19.076, lon: 72.8777, city: "Mumbai" }, b: { lat: 28.6139, lon: 77.209, city: "Delhi" }, language: "en" });
    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    expect(within(cards[1]!).getByText("Very Poor")).toBeTruthy();
    expect(within(cards[1]!).getByText("usually 13:00–17:00")).toBeTruthy();
    expect(within(cards[1]!).getByText("This reading is more than 3 hours old.")).toBeTruthy();
    expect(within(cards[0]!).getByText("14:00–17:00")).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("sends a typed place as a query and keeps Compare disabled until it has 2+ characters", async () => {
    const fetchMock = stub(() => Response.json(both));
    const user = userEvent.setup();
    render(<Compare location={location} language="en" />);
    await user.selectOptions(screen.getByLabelText("Place 2"), "Another place…");
    const compare = screen.getByRole("button", { name: "Compare" }) as HTMLButtonElement;
    expect(compare.disabled).toBe(true);
    await user.type(screen.getByLabelText("Name of place 2"), "Powai");
    expect(compare.disabled).toBe(false);
    await user.click(compare);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).b).toEqual({ query: "Powai" });
  });

  it("remembers the last choices on this device", async () => {
    const user = userEvent.setup();
    const first = render(<Compare location={location} language="en" />);
    await user.selectOptions(screen.getByLabelText("Place 2"), "Pune");
    first.unmount();
    render(<Compare location={location} language="en" />);
    await waitFor(() => expect((screen.getByLabelText("Place 2") as HTMLSelectElement).value).toBe("Pune"));
  });

  it("shows one side's problem without hiding the other, and no sentence", async () => {
    stub(() => Response.json({ a: okSide(), b: { status: "unavailable", label: "Nowhere", code: "PLACE_NOT_FOUND" } }));
    const user = userEvent.setup();
    const { container } = render(<Compare location={location} language="en" />);
    await user.click(screen.getByRole("button", { name: "Compare" }));
    expect((await screen.findByRole("alert")).textContent).toContain("We couldn't find that place.");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText(/cleaner air right now|similar in both/)).toBeNull();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("shows a typed API error and survives a network failure", async () => {
    stub(() => Response.json({ error: { code: "BAD_REQUEST", message: "x" } }, { status: 400 }));
    const user = userEvent.setup();
    render(<Compare location={location} language="en" />);
    await user.click(screen.getByRole("button", { name: "Compare" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Some details look invalid");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network"); }));
    await user.click(screen.getByRole("button", { name: "Compare" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Couldn't reach SmogSense"));
  });

  it("renders in Hindi with no axe violations", async () => {
    stub(() => Response.json(both));
    const user = userEvent.setup();
    const { container } = render(<Compare location={location} language="hi" />);
    await user.click(screen.getByRole("button", { name: "तुलना करें" }));
    expect(await screen.findByText(/में अभी हवा साफ़ है/)).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });
});
