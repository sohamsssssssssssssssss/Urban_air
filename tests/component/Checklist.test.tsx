// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import Checklist from "@/features/checklist/Checklist";
import { profile, snapshot } from "../fixtures/data";
import { installMemoryStorage, type MemoryStorage } from "../fixtures/memoryStorage";

const KEY = "smogsense:v1:checklist";
let storage: MemoryStorage;
beforeEach(() => {
  storage = installMemoryStorage();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const renderList = (lang: "en" | "hi" = "en") => render(<Checklist snapshot={snapshot} profile={profile} language={lang} />);

describe("Checklist", () => {
  it("shows each action with Why and Impact, progress, storage note, and no axe violations", async () => {
    const { container } = renderList();
    expect(screen.getByRole("heading", { level: 2, name: "Household checklist for today" })).toBeTruthy();
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
    expect(screen.getAllByText("Why")).toHaveLength(4);
    expect(screen.getAllByText("Impact")).toHaveLength(4);
    expect(screen.getByText("0 of 4 done")).toBeTruthy();
    expect(screen.getByText(/Saved on this device only/)).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("saves ticks on this device and restores them after a reload", async () => {
    const user = userEvent.setup();
    const first = renderList();
    await user.click(screen.getAllByRole("checkbox")[0]!);
    expect(screen.getByText("1 of 4 done")).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem(KEY)!).checked).toHaveLength(1);
    first.unmount();
    renderList();
    expect(await screen.findByText("1 of 4 done")).toBeTruthy();
    expect((screen.getAllByRole("checkbox")[0] as HTMLInputElement).checked).toBe(true);
  });

  it("starts clean the next day", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: Date.parse("2026-11-22T06:00:00Z") });
    const user = userEvent.setup({ advanceTimers: () => undefined });
    const first = renderList();
    await user.click(screen.getAllByRole("checkbox")[0]!);
    first.unmount();
    vi.setSystemTime(Date.parse("2026-11-22T19:00:00Z")); // 00:30 IST next day
    renderList();
    expect(await screen.findByText("0 of 4 done")).toBeTruthy();
  });

  it("unchecks all", async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(screen.getAllByRole("checkbox")[0]!);
    await user.click(screen.getAllByRole("checkbox")[1]!);
    expect(screen.getByText("2 of 4 done")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Uncheck all" }));
    expect(screen.getByText("0 of 4 done")).toBeTruthy();
  });

  it("ignores corrupt saved data and keeps working when storage is blocked", async () => {
    window.localStorage.setItem(KEY, "{garbage");
    const user = userEvent.setup();
    renderList();
    expect(await screen.findByText("0 of 4 done")).toBeTruthy();
    vi.spyOn(storage, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    await user.click(screen.getAllByRole("checkbox")[0]!);
    expect(screen.getByText("1 of 4 done")).toBeTruthy(); // in-memory state still updates
  });

  it("renders in Hindi with no axe violations", async () => {
    const { container } = renderList("hi");
    expect(screen.getByRole("heading", { name: "आज के लिए घर की चेकलिस्ट" })).toBeTruthy();
    expect(screen.getByText("4 में से 0 पूरे")).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });
});
