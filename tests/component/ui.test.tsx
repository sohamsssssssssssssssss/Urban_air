// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import Nav from "@/components/shell/Nav";
import LanguageSwitch from "@/components/shell/LanguageSwitch";
import Onboarding from "@/components/shell/Onboarding";
import { sectionFromHash } from "@/components/shell/sections";
import { impactPercent } from "@/components/impact";
import Bar from "@/components/ui/Bar";
import Dialog from "@/components/ui/Dialog";
import EmptyState from "@/components/ui/EmptyState";
import Pill from "@/components/ui/Pill";
import Skeleton from "@/components/ui/Skeleton";
import Sparkline from "@/components/ui/Sparkline";
import { historyExtremes, sparklinePoints } from "@/components/ui/sparkMath";
import Tabs from "@/components/ui/Tabs";

afterEach(cleanup);

// jsdom has no modal <dialog> support: a minimal stand-in for open/close and the close event.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };

describe("section routing", () => {
  it("maps hashes to sections and ignores everything else (e.g. the skip link)", () => {
    expect(sectionFromHash("#plan")).toBe("plan");
    expect(sectionFromHash("outlook")).toBe("outlook");
    expect(sectionFromHash("#main")).toBeNull();
    expect(sectionFromHash("")).toBeNull();
  });
});

describe("Nav", () => {
  it.each(["en", "hi"] as const)("marks the current section with aria-current, each link has a text label (%s)", async (language) => {
    const { container } = render(<Nav active="routes" language={language} />);
    const current = container.querySelectorAll("[aria-current='page']");
    expect(current.length).toBe(2); // mobile bar + sidebar, only one is visible at a time
    for (const a of container.querySelectorAll("nav a[href^='#']")) expect(a.textContent?.trim().length).toBeGreaterThan(0);
    // jsdom applies no CSS, so both navs look visible here; in browsers one is display:none (the e2e axe scans cover that).
    expect((await axe(container, { rules: { "landmark-unique": { enabled: false } } })).violations).toEqual([]);
  });
});

describe("LanguageSwitch", () => {
  it("reports the pressed language and changes it", async () => {
    const onChange = vi.fn();
    render(<LanguageSwitch language="en" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("true");
    await userEvent.setup().click(screen.getByRole("button", { name: "हिन्दी" }));
    expect(onChange).toHaveBeenCalledWith("hi");
  });
});

describe("Onboarding", () => {
  it.each(["en", "hi"] as const)("asks only for city and household, submits sensible defaults, no axe violations (%s)", async (language) => {
    const onSubmit = vi.fn();
    const { container } = render(<Onboarding language={language} onSubmit={onSubmit} />);
    expect((await axe(container)).violations).toEqual([]);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("checkbox")[0]!);
    await user.click(screen.getByRole("button", { name: language === "en" ? "Show my air" : "मेरी हवा दिखाएँ" }));
    const [location, profile, lang] = onSubmit.mock.calls[0]!;
    expect(location.city).toBe("Delhi");
    expect(profile).toMatchObject({ kids: true, commuteMode: "two_wheeler", commuteKm: 10, ownsPurifier: false });
    expect(lang).toBe(language);
  });
});

describe("Dialog", () => {
  it("opens modally, closes with its button and reports the close", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<Dialog open={false} onClose={onClose} title="Ask" closeLabel="Close"><p>body</p></Dialog>);
    expect(screen.queryByText("body")).toBeNull(); // nothing mounted while closed
    rerender(<Dialog open onClose={onClose} title="Ask" closeLabel="Close"><p>body</p></Dialog>);
    const dialog = screen.getByRole("dialog", { name: "Ask" });
    expect((dialog as HTMLDialogElement).open).toBe(true);
    await userEvent.setup().click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("Tabs", () => {
  it("moves with arrow keys, Home and End and shows one panel", async () => {
    render(<Tabs label="t" tabs={[{ id: "a", label: "A", panel: "pa" }, { id: "b", label: "B", panel: "pb" }, { id: "c", label: "C", panel: "pc" }]} />);
    const user = userEvent.setup();
    screen.getByRole("tab", { name: "A" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "B" }).getAttribute("aria-selected")).toBe("true");
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "C" })).toBe(document.activeElement);
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "A" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getAllByRole("tabpanel").filter((p) => !p.hidden)).toHaveLength(1);
  });
});

describe("small primitives", () => {
  it("Sparkline has a title and description; fewer than two points renders nothing", async () => {
    const { container } = render(<Sparkline values={[1, 3, 2, 5]} title="PM2.5" description="Lowest 1, highest 5" />);
    expect(screen.getByRole("img", { name: "PM2.5" })).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
    cleanup();
    expect(render(<Sparkline values={[1]} title="x" description="y" />).container.firstChild).toBeNull();
  });
  it("sparklinePoints scales into the box (higher value = higher on screen)", () => {
    const pts = sparklinePoints([0, 10], 100, 50, 0);
    expect(pts).toEqual([{ x: 0, y: 50 }, { x: 100, y: 0 }]);
    expect(sparklinePoints([5], 100, 50)).toEqual([]);
    expect(sparklinePoints([4, 4, 4], 100, 50, 0).every((p) => p.y === 50)).toBe(true);
  });
  it("historyExtremes finds lowest and highest", () => {
    const h = [{ at: "a", pm25: 30 }, { at: "b", pm25: 10 }, { at: "c", pm25: 90 }];
    expect(historyExtremes(h)).toEqual({ low: h[1], high: h[2] });
    expect(historyExtremes([])).toBeNull();
  });
  it("impactPercent reads the first percentage and ignores impossible ones", () => {
    expect(impactPercent("62% less PM2.5 inhaled")).toBe(62);
    expect(impactPercent("Cuts it by about 80.5 % indoors")).toBe(80.5);
    expect(impactPercent("no number here")).toBeUndefined();
    expect(impactPercent("up to 250% more")).toBeUndefined();
  });
  it("Bar clamps and is decorative; Pill/EmptyState/Skeleton have no axe violations", async () => {
    const { container } = render(<div><Bar percent={150} /><Pill tone="warn">High</Pill><Skeleton className="h-4" /><EmptyState kind="error" title="Oops" body="Try again" action={<button type="button">Retry</button>} /></div>);
    expect(container.querySelector("[style]")?.getAttribute("style")).toContain("100%");
    expect(screen.getByRole("alert").textContent).toContain("Oops");
    expect((await axe(container)).violations).toEqual([]);
  });
});
