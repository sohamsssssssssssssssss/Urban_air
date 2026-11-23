// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import KidModeToggle from "@/features/kids/KidModeToggle";

afterEach(cleanup);

describe("KidModeToggle", () => {
  it("is a labelled checkbox with a hint, and reports changes, with no axe violations", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<KidModeToggle enabled={false} busy={false} language="en" onChange={onChange} />);
    const box = screen.getByRole("checkbox", { name: "Kid-friendly wording" });
    expect(box.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText(/The numbers stay exactly the same/)).toBeTruthy();
    await user.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
    expect((await axe(container)).violations).toEqual([]);
  });
  it("announces the active and updating states, and disables itself while updating", () => {
    const { rerender } = render(<KidModeToggle enabled busy={false} language="en" onChange={vi.fn()} />);
    expect(screen.getByText(/Showing kid-friendly wording/)).toBeTruthy();
    rerender(<KidModeToggle enabled busy language="en" onChange={vi.fn()} />);
    expect(screen.getByText("Updating your plan…")).toBeTruthy();
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
  });
  it("renders in Hindi with no axe violations", async () => {
    const { container } = render(<KidModeToggle enabled={false} busy={false} language="hi" onChange={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: "बच्चों के लिए आसान शब्द" })).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });
});
