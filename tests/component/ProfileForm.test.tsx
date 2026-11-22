// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import ProfileForm, { type ProfileFormProps } from "@/components/ProfileForm";

afterEach(cleanup);
const renderForm = (props: Partial<ProfileFormProps> = {}) =>
  render(<ProfileForm onSubmit={vi.fn()} busy={false} language="en" onLanguageChange={vi.fn()} {...props} />);

describe("ProfileForm", () => {
  it("has no axe violations and every input is labelled", async () => {
    const { container } = renderForm();
    expect((await axe(container)).violations).toEqual([]);
    expect(screen.getByLabelText("City")).toBeTruthy();
    expect(screen.getByLabelText("One-way distance (km)")).toBeTruthy();
  });

  it("submits a typed location, profile and language", async () => {
    const onSubmit = vi.fn();
    const onLanguageChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = renderForm({ onSubmit, onLanguageChange });
    await user.selectOptions(screen.getByLabelText("City"), "Patna");
    await user.click(screen.getByLabelText("Children"));
    await user.selectOptions(screen.getByLabelText("Usual mode"), "car");
    await user.clear(screen.getByLabelText("One-way distance (km)"));
    await user.type(screen.getByLabelText("One-way distance (km)"), "7");
    await user.click(screen.getByLabelText("I own an air purifier"));
    await user.click(screen.getByLabelText("Low"));
    await user.click(screen.getByLabelText("हिन्दी"));
    expect(onLanguageChange).toHaveBeenCalledWith("hi");
    rerender(<ProfileForm onSubmit={onSubmit} busy={false} language="hi" onLanguageChange={onLanguageChange} />);
    await user.click(screen.getByRole("button", { name: "मेरी योजना बनाएँ" }));
    expect(onSubmit).toHaveBeenCalledWith(
      { lat: 25.5941, lon: 85.1376, city: "Patna" },
      expect.objectContaining({ kids: true, commuteMode: "car", commuteKm: 7, ownsPurifier: true, budget: "low", workStartHour: 9 }),
      "hi",
    );
  });

  it("links a distance error via aria-describedby and focuses the field", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const { container } = renderForm({ onSubmit });
    const km = screen.getByLabelText("One-way distance (km)");
    await user.clear(km);
    await user.type(km, "500");
    await user.click(screen.getByRole("button", { name: "Get my plan" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(km.getAttribute("aria-invalid")).toBe("true");
    const describedBy = km.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toMatch(/between 0 and 100/);
    expect(document.activeElement).toBe(km);
    expect((await axe(container)).violations).toEqual([]);
  });

  it("uses GPS coordinates when the user shares location", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: 19.1, longitude: 72.9 } } as GeolocationPosition) },
    });
    renderForm({ onSubmit });
    await user.click(screen.getByRole("button", { name: "Use my current location" }));
    expect(screen.getByText(/nearest listed city: Mumbai/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Get my plan" }));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ lat: 19.1, lon: 72.9, city: "Mumbai" });
  });

  it("renders every label in Hindi with no axe violations", async () => {
    const { container } = renderForm({ language: "hi" });
    for (const label of ["शहर", "बच्चे", "आम तौर पर साधन", "एक तरफ़ की दूरी (कि.मी.)", "मेरे पास एयर प्यूरीफ़ायर है", "कम"]) expect(screen.getByLabelText(label)).toBeTruthy();
    expect(screen.getByRole("option", { name: "मेट्रो" })).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });
});
