// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import AdviceTabs from "@/components/AdviceTabs";
import { ruleBasedAdvice } from "@/lib/ai/fallback";
import { buildFacts } from "@/lib/impact/facts";
import { profile, snapshot } from "../fixtures/data";

afterEach(cleanup);
const advice = ruleBasedAdvice(snapshot, buildFacts(snapshot, profile, true));

describe("AdviceTabs", () => {
  it("renders why/impact/personalisation with no axe violations", async () => {
    const { container } = render(<AdviceTabs advice={advice} generatedBy="rules" language="en" />);
    expect(screen.getByText(/Rule-based plan/)).toBeTruthy();
    expect(within(screen.getByRole("tabpanel")).getAllByText("Impact").length).toBe(advice.routines.length);
    expect((await axe(container)).violations).toEqual([]);
  });

  it("gives every tip a feedback control (tips without an id get none)", () => {
    render(<AdviceTabs advice={advice} generatedBy="rules" language="en" />);
    expect(within(screen.getByRole("tabpanel")).getAllByRole("group", { name: "Was this tip useful?" })).toHaveLength(advice.routines.length);
    cleanup();
    const noIds = { ...advice, routines: advice.routines.map((item) => ({ ...item, id: undefined })) };
    render(<AdviceTabs advice={noIds} generatedBy="rules" language="en" />);
    expect(within(screen.getByRole("tabpanel")).queryAllByRole("group", { name: "Was this tip useful?" })).toHaveLength(0);
  });

  it("supports arrow, Home and End keys between tabs", async () => {
    const user = userEvent.setup();
    render(<AdviceTabs advice={advice} generatedBy="gemini" language="en" />);
    const [routines, indoor, alternatives] = screen.getAllByRole("tab");
    await user.click(routines!);
    await user.keyboard("{ArrowRight}");
    expect(indoor!.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(indoor);
    expect(screen.getByRole("tabpanel").textContent).toContain("purifier");
    await user.keyboard("{End}");
    expect(alternatives!.getAttribute("aria-selected")).toBe("true");
    await user.keyboard("{ArrowRight}");
    expect(routines!.getAttribute("aria-selected")).toBe("true");
    await user.keyboard("{ArrowLeft}");
    expect(alternatives!.getAttribute("aria-selected")).toBe("true");
    await user.keyboard("{Home}");
    expect(routines!.getAttribute("aria-selected")).toBe("true");
  });

  it("renders model text as plain text, never HTML", () => {
    const evil = { ...advice, summary: "<img src=x onerror=alert(1)>" };
    const { container } = render(<AdviceTabs advice={evil} generatedBy="gemini" language="hi" />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
  });
});

describe("AdviceTabs in Hindi", () => {
  it("localises labels and has no axe violations", async () => {
    const hi = ruleBasedAdvice(snapshot, buildFacts(snapshot, profile, true, "hi"), "hi");
    const { container } = render(<AdviceTabs advice={hi} generatedBy="rules" language="hi" />);
    expect(screen.getByRole("tab", { name: /रोज़ की आदतें/ })).toBeTruthy();
    expect(within(screen.getByRole("tabpanel")).getAllByText("असर").length).toBe(hi.routines.length);
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe("AI fallback note", () => {
  it.each([
    ["quota", "en", "Rule-based plan (AI busy (quota))"],
    ["model", "en", "Rule-based plan (AI model unavailable)"],
    ["timeout", "hi", "नियम-आधारित योजना (AI में देरी हुई)"],
  ] as const)("names the reason code (%s, %s) without exposing provider messages", (reason, language, text) => {
    render(<AdviceTabs advice={advice} generatedBy="rules" fallbackReason={reason} language={language} />);
    expect(screen.getByText(new RegExp(text.replace(/[()]/g, "\\$&")))).toBeTruthy();
  });
  it("defaults to a generic note and shows no note for AI plans", () => {
    const { unmount } = render(<AdviceTabs advice={advice} generatedBy="rules" language="en" />);
    expect(screen.getByText(/Rule-based plan \(AI unavailable\)/)).toBeTruthy();
    unmount();
    render(<AdviceTabs advice={advice} generatedBy="gemini" language="en" />);
    expect(screen.queryByText(/Rule-based/)).toBeNull();
  });
});
