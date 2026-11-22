// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import ChatPanel from "@/components/ChatPanel";
import { location, profile } from "../fixtures/data";

afterEach(cleanup);

describe("ChatPanel", () => {
  it("streams the answer into a polite log and has no axe violations", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Stay indoors today.", { status: 200 })));
    const user = userEvent.setup();
    const { container } = render(<ChatPanel location={location} profile={profile} language="en" />);
    await user.type(screen.getByLabelText("Your question"), "Can we go to the park?");
    expect(screen.getByText("22/500 characters")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Ask" }));
    await waitFor(() => expect(screen.getByRole("log").textContent).toContain("Stay indoors today."));
    expect((await axe(container)).violations).toEqual([]);
  });

  it("shows the API error and restores the draft", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { code: "AI_UNAVAILABLE", message: "Chat needs a Gemini API key." } }, { status: 503 })));
    const user = userEvent.setup();
    render(<ChatPanel location={location} profile={profile} language="en" />);
    await user.type(screen.getByLabelText("Your question"), "Hello");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Chat needs a Gemini API key.");
    expect((screen.getByLabelText("Your question") as HTMLTextAreaElement).value).toBe("Hello");
  });
});
