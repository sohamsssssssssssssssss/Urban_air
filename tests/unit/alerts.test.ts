import { afterEach, describe, expect, it, vi } from "vitest";
import { ALERT_RENOTIFY_MS, ALERT_THRESHOLDS } from "@/features/alerts/constants";
import { bandOf, evaluateReading } from "@/features/alerts/logic";
import { permissionState, registerServiceWorker, requestPermission, showNotification } from "@/features/alerts/notify";
import { AlertSettingsSchema } from "@/features/alerts/schema";

const NOW = 1_000_000;
const at = (aqi: number, lastNotified: { at: number; aqi: number } | null = null, threshold = 201) => evaluateReading({ threshold: threshold as never, lastNotified }, aqi, NOW);

describe("evaluateReading", () => {
  it("is quiet below the threshold and forgets the last alert so the next crossing notifies again", () => {
    expect(at(200)).toEqual({ notify: false, above: false, lastNotified: null });
    expect(at(150, { at: NOW - 1000, aqi: 300 })).toEqual({ notify: false, above: false, lastNotified: null });
  });
  it("notifies on the first crossing, including exactly at the threshold", () => {
    expect(at(201)).toEqual({ notify: true, above: true, lastNotified: { at: NOW, aqi: 201 } });
  });
  it("stays quiet while the level stays in the same band, and keeps the previous alert time", () => {
    const last = { at: NOW - 60_000, aqi: 230 };
    expect(at(260, last)).toEqual({ notify: false, above: true, lastNotified: last });
  });
  it("notifies again when the band gets worse", () => {
    const last = { at: NOW - 60_000, aqi: 250 };
    expect(at(310, last)).toMatchObject({ notify: true, lastNotified: { at: NOW, aqi: 310 } });
  });
  it("does not notify again when the band improves but is still above the threshold", () => {
    expect(at(260, { at: NOW - 60_000, aqi: 310 }).notify).toBe(false);
  });
  it("notifies again after the cooldown, even in the same band", () => {
    expect(at(250, { at: NOW - ALERT_RENOTIFY_MS + 1, aqi: 250 }).notify).toBe(false);
    expect(at(250, { at: NOW - ALERT_RENOTIFY_MS, aqi: 250 }).notify).toBe(true);
  });
  it("notifies again after dropping below and crossing back", () => {
    const cleared = at(150, { at: NOW - 1000, aqi: 250 });
    expect(evaluateReading({ threshold: 201, lastNotified: cleared.lastNotified }, 250, NOW).notify).toBe(true);
  });
  it("works for every offered threshold", () => {
    for (const t of ALERT_THRESHOLDS) {
      expect(at(t - 1, null, t).above).toBe(false);
      expect(at(t, null, t).notify).toBe(true);
    }
  });
  it("maps AQI to CPCB bands", () => {
    expect([0, 50, 51, 100, 101, 200, 201, 300, 301, 400, 401, 500].map(bandOf)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
});

describe("settings schema", () => {
  const ok = { enabled: true, threshold: 201, city: "Delhi", lastNotified: null };
  it("accepts valid settings and rejects unknown thresholds, cities and extra keys", () => {
    expect(AlertSettingsSchema.safeParse(ok).success).toBe(true);
    expect(AlertSettingsSchema.safeParse({ ...ok, threshold: 150 }).success).toBe(false);
    expect(AlertSettingsSchema.safeParse({ ...ok, city: "Atlantis" }).success).toBe(false);
    expect(AlertSettingsSchema.safeParse({ ...ok, extra: 1 }).success).toBe(false);
    expect(AlertSettingsSchema.safeParse({ ...ok, lastNotified: { at: 1, aqi: 250 } }).success).toBe(true);
  });
});

describe("notifications (browser APIs stubbed)", () => {
  afterEach(() => vi.unstubAllGlobals());
  const stubNotification = (permission: NotificationPermission, requestPermission = vi.fn(async () => permission)) => {
    const ctor = vi.fn();
    Object.assign(ctor, { permission, requestPermission });
    vi.stubGlobal("Notification", ctor);
    vi.stubGlobal("window", { Notification: ctor });
    return { ctor, requestPermission };
  };
  const stubNavigator = (serviceWorker?: unknown) => vi.stubGlobal("navigator", serviceWorker ? { serviceWorker } : {});

  it("reports unsupported where the Notification API is missing", async () => {
    vi.stubGlobal("window", {});
    expect(permissionState()).toBe("unsupported");
    expect(await requestPermission()).toBe("unsupported");
    expect(await showNotification("t", "b", "tag")).toBe(false);
  });
  it("asks for permission only when called, and returns the answer", async () => {
    const { requestPermission: ask } = stubNotification("default", vi.fn(async () => "granted" as const));
    expect(permissionState()).toBe("default");
    expect(ask).not.toHaveBeenCalled();
    expect(await requestPermission()).toBe("granted");
    expect(ask).toHaveBeenCalledTimes(1);
  });
  it("falls back to the current state if the permission prompt throws", async () => {
    stubNotification("default", vi.fn(async () => { throw new Error("blocked"); }));
    expect(await requestPermission()).toBe("default");
  });
  it("shows nothing unless permission is granted", async () => {
    const { ctor } = stubNotification("denied");
    stubNavigator();
    expect(await showNotification("t", "b", "tag")).toBe(false);
    expect(ctor).not.toHaveBeenCalled();
  });
  it("uses the service worker registration when there is one (required on Android)", async () => {
    const { ctor } = stubNotification("granted");
    const showNotificationMock = vi.fn(async () => undefined);
    stubNavigator({ getRegistration: async () => ({ showNotification: showNotificationMock }) });
    expect(await showNotification("Title", "Body", "tag")).toBe(true);
    expect(showNotificationMock).toHaveBeenCalledWith("Title", { body: "Body", tag: "tag", icon: "/icon.svg" });
    expect(ctor).not.toHaveBeenCalled();
  });
  it("falls back to new Notification without a registration", async () => {
    const { ctor } = stubNotification("granted");
    stubNavigator({ getRegistration: async () => undefined });
    expect(await showNotification("Title", "Body", "tag")).toBe(true);
    expect(ctor).toHaveBeenCalledWith("Title", { body: "Body", tag: "tag", icon: "/icon.svg" });
  });
  it("never throws when showing fails", async () => {
    stubNotification("granted");
    stubNavigator({ getRegistration: async () => { throw new Error("nope"); } });
    expect(await showNotification("t", "b", "tag")).toBe(false);
  });
  it("registers /sw.js and reports unsupported or failed registration quietly", async () => {
    const register = vi.fn(async () => ({}));
    stubNavigator({ register });
    expect(await registerServiceWorker()).toBe(true);
    expect(register).toHaveBeenCalledWith("/sw.js");
    stubNavigator();
    expect(await registerServiceWorker()).toBe(false);
    stubNavigator({ register: async () => { throw new Error("insecure"); } });
    expect(await registerServiceWorker()).toBe(false);
  });
});
