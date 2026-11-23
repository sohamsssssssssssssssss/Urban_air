// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import AlertPanel from "@/features/alerts/AlertPanel";
import { ALERT_POLL_MS, ALERT_RENOTIFY_MS } from "@/features/alerts/constants";
import { categoryFor } from "@/lib/aq/naqi";
import { snapshot } from "../fixtures/data";
import { installMemoryStorage, type MemoryStorage } from "../fixtures/memoryStorage";

const KEY = "smogsense:v1:alerts";
const location = { lat: 19.076, lon: 72.8777, city: "Mumbai" as const };
let storage: MemoryStorage;
let aqi: number;
let fetchMock: ReturnType<typeof vi.fn>;
let notifications: ReturnType<typeof vi.fn>;
let requestPermission: ReturnType<typeof vi.fn>;

function stubNotifications(permission: NotificationPermission) {
  requestPermission = vi.fn(async () => "granted" as NotificationPermission);
  notifications = vi.fn();
  Object.assign(notifications, { permission, requestPermission });
  vi.stubGlobal("Notification", notifications);
}

beforeEach(() => {
  storage = installMemoryStorage();
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"], now: Date.parse("2026-11-23T06:00:00Z") });
  aqi = 150;
  fetchMock = vi.fn(async () => Response.json({ snapshot: { ...snapshot, aqi, category: categoryFor(aqi) } }));
  vi.stubGlobal("fetch", fetchMock);
  stubNotifications("default");
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const renderPanel = (language: "en" | "hi" = "en") =>
  render(<><div id="alert-slot" /><AlertPanel location={location} language={language} /></>);
const toggle = (lang: "en" | "hi" = "en") => screen.getByRole("button", { name: lang === "en" ? "In-app alerts" : "ऐप के अंदर अलर्ट" });
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const turnOn = async () => {
  await userEvent.setup().click(toggle());
  await act(() => vi.advanceTimersByTimeAsync(0));
};

describe("AlertPanel", () => {
  it("states the honest limit, checks nothing and asks for no permission until the user acts, with no axe violations", async () => {
    const { container } = renderPanel();
    expect(screen.getByRole("heading", { level: 2, name: "Air alerts" })).toBeTruthy();
    expect(screen.getByText(/work only while SmogSense is open/)).toBeTruthy();
    expect(screen.getByText(/deliberately keeps none/)).toBeTruthy();
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    await tick(ALERT_POLL_MS * 3);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(requestPermission).not.toHaveBeenCalled(); // never auto-requested
    expect((await axe(container)).violations).toEqual([]);
  });

  it("starts watching on opt-in: checks now, shows the result, then checks every 30 minutes", async () => {
    renderPanel();
    await turnOn();
    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    expect(String(fetchMock.mock.calls[0]![0])).toBe("/api/air?lat=19.076&lon=72.8777&city=Mumbai");
    expect(screen.getByText(/Last checked .*: AQI 150\. Checks again every 30 minutes/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull(); // 150 is below the default level of 201
    await tick(ALERT_POLL_MS);
    await tick(ALERT_POLL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("shows a banner at the top of the page, and a notification once, when the level is reached", async () => {
    stubNotifications("granted");
    aqi = 250;
    const { container } = renderPanel();
    await turnOn();
    const banner = await screen.findByRole("alert");
    expect(banner.textContent).toContain("Air alert: AQI 250 (Poor) in Mumbai");
    expect(banner.closest("#alert-slot")).not.toBeNull(); // portalled to the top slot
    expect(banner.className).not.toMatch(/animate|transition/); // static: nothing to suppress under prefers-reduced-motion
    expect(notifications).toHaveBeenCalledTimes(1);
    expect(notifications.mock.calls[0]![0]).toBe("SmogSense: AQI 250 (Poor) in Mumbai");
    await tick(ALERT_POLL_MS * 2);
    expect(notifications).toHaveBeenCalledTimes(1); // same band: no repeat
    expect((await axe(container.ownerDocument.body)).violations).toEqual([]);
  });

  it("notifies again when the band gets worse, and after the cooldown", async () => {
    stubNotifications("granted");
    aqi = 250;
    renderPanel();
    await turnOn();
    aqi = 350;
    await tick(ALERT_POLL_MS);
    expect(notifications).toHaveBeenCalledTimes(2);
    expect(notifications.mock.calls[1]![0]).toContain("AQI 350 (Very Poor)");
    await tick(ALERT_RENOTIFY_MS);
    expect(notifications.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("does not show browser notifications without permission, but still shows the banner", async () => {
    aqi = 250;
    renderPanel();
    await turnOn();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(notifications).not.toHaveBeenCalled();
  });

  it("dismisses the banner", async () => {
    aqi = 250;
    renderPanel();
    await turnOn();
    await userEvent.setup().click(await screen.findByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("asks for permission only from the Allow button, then registers the service worker", async () => {
    const register = vi.fn(async () => ({}));
    Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });
    renderPanel();
    expect(screen.getByText(/Not asked yet/)).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: "Allow browser notifications" }));
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith("/sw.js");
    expect(await screen.findByText(/^Allowed\./)).toBeTruthy();
    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  it.each([
    ["denied", /^Blocked in your browser settings/],
    ["granted", /^Allowed\./],
  ] as const)("shows the %s permission state and hides the Allow button", (permission, text) => {
    stubNotifications(permission);
    renderPanel();
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Allow browser notifications" })).toBeNull();
  });

  it("says when the browser has no notification support and still works", async () => {
    Reflect.deleteProperty(globalThis, "Notification");
    aqi = 250;
    renderPanel();
    expect(await screen.findByText(/does not support notifications/)).toBeTruthy();
    await turnOn();
    expect(await screen.findByRole("alert")).toBeTruthy();
  });

  it("stops checking when turned off or unmounted", async () => {
    const view = renderPanel();
    await turnOn();
    await userEvent.setup().click(toggle());
    await tick(ALERT_POLL_MS * 2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await userEvent.setup().click(toggle());
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    view.unmount();
    await tick(ALERT_POLL_MS * 2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("catches up when the tab becomes visible after a long gap, but not after a short one", async () => {
    renderPanel();
    await turnOn();
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    vi.setSystemTime(Date.now() + 5 * 60_000);
    document.dispatchEvent(new Event("visibilitychange"));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + ALERT_POLL_MS);
    document.dispatchEvent(new Event("visibilitychange"));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports a failed check and recovers on the next one", async () => {
    renderPanel();
    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    await turnOn();
    expect(screen.getByText(/Couldn't check the air quality just now/)).toBeTruthy();
    await tick(ALERT_POLL_MS);
    expect(screen.getByText(/Last checked/)).toBeTruthy();
  });

  it("remembers settings and the last alert on this device, and resumes after a reload", async () => {
    stubNotifications("granted");
    aqi = 250;
    const first = renderPanel();
    await turnOn();
    await userEvent.setup().selectOptions(screen.getByLabelText("Alert me when AQI reaches"), "301");
    expect(JSON.parse(storage.getItem(KEY)!)).toMatchObject({ enabled: true, threshold: 301, city: "Mumbai", lastNotified: null });
    first.unmount();
    renderPanel();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByLabelText("Alert me when AQI reaches") as HTMLSelectElement).value).toBe("301");
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("renders in Hindi with no axe violations", async () => {
    aqi = 250;
    const { container } = renderPanel("hi");
    await userEvent.setup().click(toggle("hi"));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect((await screen.findByRole("alert")).textContent).toContain("हवा का अलर्ट: Mumbai में AQI 250");
    expect(screen.getByRole("heading", { level: 2, name: "हवा के अलर्ट" })).toBeTruthy();
    expect((await axe(container.ownerDocument.body)).violations).toEqual([]);
  });
});
