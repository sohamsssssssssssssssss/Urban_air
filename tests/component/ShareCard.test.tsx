// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import ShareCard from "@/features/share/ShareCard";
import { installMemoryStorage, type MemoryStorage } from "../fixtures/memoryStorage";

let storage: MemoryStorage;
const today = new Date().toISOString().slice(0, 10);
const withTrips = () => storage.setItem("smogsense:v1:tracker", JSON.stringify({ baseline: "car", trips: [{ id: "a", date: today, mode: "metro", km: 10, source: "manual", ambientUgm3: 100 }] }));

beforeEach(() => {
  storage = installMemoryStorage();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const img = () => screen.getByRole("img") as HTMLImageElement;
const stubFetch = (blob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" })) => vi.stubGlobal("fetch", vi.fn(async () => ({ blob: async () => blob })));

describe("ShareCard", () => {
  it("previews today's card with a descriptive alt text and states what is and is not on it, with no axe violations", async () => {
    const { container } = render(<ShareCard city="Mumbai" language="en" />);
    expect(img().getAttribute("src")).toBe("/api/card?kind=today&city=Mumbai&lang=en");
    expect(img().alt).toContain("Share card for Mumbai: today's AQI and category");
    expect(img().getAttribute("width")).toBe("1200");
    expect(img().getAttribute("height")).toBe("630");
    expect(screen.getByText(/Never on the card: your name, exact location, household details or trip list/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Download image" }).getAttribute("href")).toBe("/api/card?kind=today&city=Mumbai&lang=en");
    expect((await axe(container)).violations).toEqual([]);
  });

  it("changes the preview when the city changes", async () => {
    render(<ShareCard city="Mumbai" language="en" />);
    await userEvent.setup().selectOptions(screen.getByLabelText("City"), "Pune");
    expect(img().getAttribute("src")).toBe("/api/card?kind=today&city=Pune&lang=en");
  });

  it("asks you to log a trip first when there is nothing to share, and offers no share or download", async () => {
    render(<ShareCard city="Delhi" language="en" />);
    await userEvent.setup().selectOptions(screen.getByLabelText("Card"), "weekly");
    expect(screen.getByText(/Log a trip in the commute tracker first/)).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect((screen.getByRole("button", { name: "Share image" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("link", { name: "Download image" })).toBeNull();
  });

  it("builds the personal card from the trips saved on this device, and follows the period", async () => {
    withTrips();
    const user = userEvent.setup();
    const { container } = render(<ShareCard city="Delhi" language="en" />);
    await user.selectOptions(screen.getByLabelText("Card"), "weekly");
    const src = new URL(img().getAttribute("src")!, "http://x");
    expect(Object.fromEntries(src.searchParams)).toMatchObject({ kind: "weekly", lang: "en", period: "week", trips: "1", km: "10.0", co2: "1.2" });
    expect(img().alt).toBe("Share card with your commute impact: 1.2 kg of CO2 avoided over 1 trip, with an estimate of PM2.5 breathed in.");
    await user.selectOptions(screen.getByLabelText("Period"), "all");
    expect(new URL(img().getAttribute("src")!, "http://x").searchParams.get("period")).toBe("all");
    expect((await axe(container)).violations).toEqual([]);
  });

  it("shares the image through the Web Share API when the browser can share files", async () => {
    stubFetch();
    const share = vi.fn(async () => undefined);
    Object.assign(navigator, { canShare: vi.fn(() => true), share });
    render(<ShareCard city="Delhi" language="en" />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Share image" }));
    expect(await screen.findByText("Shared.")).toBeTruthy();
    const arg = (share.mock.calls[0] as unknown as [{ files: File[]; title: string }])[0];
    expect(arg.files[0]).toBeInstanceOf(File);
    expect(arg.files[0]!.name).toBe("smogsense-card.png");
    expect(arg.files[0]!.type).toBe("image/png");
    expect(arg.title).toBe("SmogSense");
    Reflect.deleteProperty(navigator, "canShare");
    Reflect.deleteProperty(navigator, "share");
  });

  it("downloads the image instead where files cannot be shared", async () => {
    stubFetch();
    const createObjectURL = vi.fn(() => "blob:card");
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<ShareCard city="Delhi" language="en" />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Share image" }));
    await vi.waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("stays quiet when the user cancels the share sheet, and reports other failures", async () => {
    stubFetch();
    const share = vi.fn().mockRejectedValueOnce(new DOMException("cancelled", "AbortError")).mockRejectedValueOnce(new Error("boom"));
    Object.assign(navigator, { canShare: () => true, share });
    render(<ShareCard city="Delhi" language="en" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Share image" }));
    await vi.waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Couldn't share it from here/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Share image" }));
    expect(await screen.findByText("Couldn't share it from here. Use Download image instead.")).toBeTruthy();
    Reflect.deleteProperty(navigator, "canShare");
    Reflect.deleteProperty(navigator, "share");
  });

  it("shows a readable error when the card cannot be created", () => {
    render(<ShareCard city="Delhi" language="en" />);
    fireEvent.error(img());
    expect(screen.getByRole("alert").textContent).toContain("The card couldn't be created right now");
    expect((screen.getByRole("button", { name: "Share image" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders in Hindi with no axe violations and a Hindi card request", async () => {
    const { container } = render(<ShareCard city="Delhi" language="hi" />);
    expect(screen.getByRole("heading", { level: 2, name: "कार्ड शेयर करें" })).toBeTruthy();
    expect(img().getAttribute("src")).toContain("lang=hi");
    expect(img().alt).toContain("Delhi");
    expect((await axe(container)).violations).toEqual([]);
  });
});
