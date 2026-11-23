// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import Tracker from "@/features/tracker/Tracker";
import type { TripDraft } from "@/features/tracker/schema";
import { installMemoryStorage, type MemoryStorage } from "../fixtures/memoryStorage";

const KEY = "smogsense:v1:tracker";
let storage: MemoryStorage;
beforeEach(() => {
  storage = installMemoryStorage();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const renderTracker = (over: Partial<Parameters<typeof Tracker>[0]> = {}) =>
  render(<Tracker language="en" defaultBaseline="car" ambientUgm3={100} draft={null} {...over} />);
const logTrip = async (user: ReturnType<typeof userEvent.setup>, km: string, mode = "metro") => {
  await user.selectOptions(screen.getByLabelText("Mode"), mode);
  await user.clear(screen.getByLabelText("Distance (km)"));
  await user.type(screen.getByLabelText("Distance (km)"), km);
  await user.click(screen.getByRole("button", { name: "Log trip" }));
};

describe("Tracker", () => {
  it("is labelled, explains that figures are estimates and where data lives, with no axe violations", async () => {
    const { container } = renderTracker();
    expect(screen.getByRole("heading", { level: 2, name: "Commute impact tracker" })).toBeTruthy();
    expect(screen.getByLabelText("Your usual mode (baseline)")).toBeTruthy();
    expect(screen.getByText(/Estimates only/)).toBeTruthy();
    expect(screen.getByText(/Saved on this device only/)).toBeTruthy();
    expect(screen.getByText("No trips yet. Log your first trip above.")).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("logs a trip, updates the weekly/monthly totals vs the baseline, and saves it on the device", async () => {
    const user = userEvent.setup();
    const { container } = renderTracker();
    await logTrip(user, "10");
    expect(screen.getByText("Trip logged.")).toBeTruthy();
    const week = screen.getByRole("heading", { name: "This week" }).closest("li")!;
    expect(week.textContent).toContain("1 trip · 10 km");
    expect(week.textContent).toContain("1.2 kg CO₂ avoided"); // 1.15 kg, rounded to one decimal
    expect(week.textContent).toMatch(/µg PM2\.5 inhaled less \(est\.\)/);
    expect(screen.getByRole("heading", { name: "This month" }).closest("li")!.textContent).toContain("1 trip");
    expect(JSON.parse(storage.getItem(KEY)!).trips[0]).toMatchObject({ mode: "metro", km: 10, source: "manual", ambientUgm3: 100 });
    expect((screen.getByLabelText("Distance (km)") as HTMLInputElement).value).toBe("");
    expect((await axe(container)).violations).toEqual([]);
  });

  it("reports extra emissions when the trip is worse than the baseline", async () => {
    const user = userEvent.setup();
    renderTracker({ defaultBaseline: "metro" });
    await logTrip(user, "10", "car");
    expect(screen.getByRole("heading", { name: "This week" }).closest("li")!.textContent).toMatch(/kg CO₂ extra.*µg PM2\.5 inhaled more/);
  });

  it("does not estimate PM2.5 when the air level is unknown", async () => {
    const user = userEvent.setup();
    renderTracker({ ambientUgm3: null });
    await logTrip(user, "5");
    expect(screen.getByRole("heading", { name: "This week" }).closest("li")!.textContent).toContain("PM2.5 not estimated");
  });

  it("restores saved trips after a reload and ignores corrupt data", async () => {
    const user = userEvent.setup();
    const first = renderTracker();
    await logTrip(user, "10");
    first.unmount();
    renderTracker();
    expect((await screen.findAllByText(/1 trip · 10 km/, { selector: "p" })).length).toBe(3); // week, month, all time
    cleanup();
    storage.setItem(KEY, "{garbage");
    renderTracker();
    expect(await screen.findByText("No trips yet. Log your first trip above.")).toBeTruthy();
  });

  it("rejects an invalid distance and a future date with a clear message", () => {
    renderTracker();
    fireEvent.change(screen.getByLabelText("Distance (km)"), { target: { value: "0" } });
    fireEvent.submit(screen.getByRole("button", { name: "Log trip" }).closest("form")!);
    expect(screen.getByText("Check the distance (0.1 to 100 km) and date.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Distance (km)"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2099-01-01" } });
    fireEvent.submit(screen.getByRole("button", { name: "Log trip" }).closest("form")!);
    expect(screen.getByText("The date can't be in the future.")).toBeTruthy();
  });

  it("prefills from a route chosen in the planner and records its source and air level", async () => {
    const user = userEvent.setup();
    const draft: TripDraft = { mode: "cycle", km: 18.4, ambientUgm3: 78.1 };
    renderTracker({ draft });
    expect(await screen.findByText(/Prefilled from the route you chose/)).toBeTruthy();
    expect((screen.getByLabelText("Mode") as HTMLSelectElement).value).toBe("cycle");
    expect((screen.getByLabelText("Distance (km)") as HTMLInputElement).value).toBe("18.4");
    await user.click(screen.getByRole("button", { name: "Log trip" }));
    expect(JSON.parse(storage.getItem(KEY)!).trips[0]).toMatchObject({ mode: "cycle", km: 18.4, source: "route", ambientUgm3: 78.1 });
    expect(screen.queryByText(/Prefilled from the route/)).toBeNull();
  });

  it("removes a single trip", async () => {
    const user = userEvent.setup();
    renderTracker();
    await logTrip(user, "10");
    await user.click(screen.getByRole("button", { name: /^Remove / }));
    expect(screen.getByText("No trips yet. Log your first trip above.")).toBeTruthy();
  });

  it("exports a CSV of the trips without a server", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => "blob:csv");
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    renderTracker();
    expect((screen.getByRole("button", { name: "Export CSV" }) as HTMLButtonElement).disabled).toBe(true);
    await logTrip(user, "10");
    await user.click(screen.getByRole("button", { name: "Export CSV" }));
    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
    expect(await blob.text()).toContain("date,mode,km,source");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith("blob:csv");
  });

  it("clears all data only after a second, explicit confirmation", async () => {
    const user = userEvent.setup();
    const { container } = renderTracker();
    await logTrip(user, "10");
    await user.click(screen.getByRole("button", { name: "Clear all data" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("Delete all 1 trips from this device?");
    expect((await axe(container)).violations).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(JSON.parse(storage.getItem(KEY)!).trips).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Clear all data" }));
    await user.click(screen.getByRole("button", { name: "Yes, delete" }));
    expect(JSON.parse(storage.getItem(KEY)!).trips).toEqual([]);
    expect(screen.getByText("No trips yet. Log your first trip above.")).toBeTruthy();
  });

  it("changes the baseline and recomputes", async () => {
    const user = userEvent.setup();
    renderTracker();
    await logTrip(user, "10");
    await user.selectOptions(screen.getByLabelText("Your usual mode (baseline)"), "metro");
    expect(screen.getByRole("heading", { name: "This week" }).closest("li")!.textContent).toContain("0 kg CO₂ avoided");
  });

  it("renders in Hindi with no axe violations", async () => {
    const user = userEvent.setup();
    const { container } = renderTracker({ language: "hi" });
    expect(screen.getByRole("heading", { level: 2, name: "सफ़र का असर ट्रैकर" })).toBeTruthy();
    await user.type(screen.getByLabelText("दूरी (कि.मी.)"), "10");
    await user.click(screen.getByRole("button", { name: "सफ़र दर्ज करें" }));
    expect(screen.getByText("सफ़र दर्ज हो गया।")).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });
});
