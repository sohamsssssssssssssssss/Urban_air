// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import MaskGuide from "@/features/mask/MaskGuide";
import { profile, snapshot } from "../fixtures/data";

afterEach(cleanup);
const calm = { ...profile, kids: false, elderly: false, respiratory: false };

describe("MaskGuide", () => {
  it("gives per-activity advice for the current AQI, a children note, fit tips and sources, with no axe violations", async () => {
    const { container } = render(<MaskGuide snapshot={snapshot} profile={profile} language="en" />);
    expect(screen.getByRole("heading", { level: 2, name: "Mask guide" })).toBeTruthy();
    const row = (name: string) => screen.getByRole("rowheader", { name }).closest("tr")!;
    expect(row("Staying indoors").textContent).toContain("No mask needed");
    expect(row("Commuting or errands outside").textContent).toContain("Close-fitted N95/FFP2 (or N99)");
    expect(row("Exercise or play outside").textContent).toContain("Avoid or keep outdoor exertion short.");
    expect(screen.getByText(/NIOSH has not approved any for children/)).toBeTruthy();
    expect(screen.getByText(/not effective against fine particles \(MoHFW\)/)).toBeTruthy();
    expect(screen.getByText(/not medical advice/)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Getting a good fit" })).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("link", { name: /Ministry of Health and Family Welfare, India/ }).getAttribute("href")).toContain("ncdc.mohfw.gov.in");
    expect((await axe(container)).violations).toEqual([]);
  });

  it("lists the six CPCB bands and reflects sensitivity in the reference table", () => {
    render(<MaskGuide snapshot={snapshot} profile={calm} language="en" />);
    const table = screen.getByRole("table", { name: "Mask advice by AQI band" });
    expect(within(table).getAllByRole("row")).toHaveLength(7);
    const moderate = within(table).getByRole("rowheader", { name: "Moderate" }).closest("tr")!;
    expect(moderate.textContent).toContain("No mask needed");
    expect(moderate.textContent).toContain("Optional: an N95/FFP2 if you are sensitive");
    expect(within(table).getByRole("rowheader", { name: "Poor" }).closest("tr")!.textContent).toContain("Close-fitted N95/FFP2");
  });

  it("hides the children note when there are no children or no mask is advised", () => {
    const { rerender } = render(<MaskGuide snapshot={snapshot} profile={calm} language="en" />);
    expect(screen.queryByText(/NIOSH has not approved any for children/)).toBeNull();
    rerender(<MaskGuide snapshot={{ ...snapshot, aqi: 40, category: "Good" }} profile={profile} language="en" />);
    expect(screen.queryByText(/NIOSH has not approved any for children/)).toBeNull();
  });

  it("renders in Hindi with no axe violations", async () => {
    const { container } = render(<MaskGuide snapshot={snapshot} profile={profile} language="hi" />);
    expect(screen.getByRole("heading", { level: 2, name: "मास्क गाइड" })).toBeTruthy();
    expect(container.textContent).toContain("अच्छी तरह फिट N95/FFP2");
    expect((await axe(container)).violations).toEqual([]);
  });
});
