// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import TipFeedback from "@/features/feedback/TipFeedback";
import { installMemoryStorage, type MemoryStorage } from "../fixtures/memoryStorage";

let storage: MemoryStorage;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  storage = installMemoryStorage();
  fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const posted = () => fetchMock.mock.calls.map((c) => JSON.parse((c[1] as RequestInit).body as string));

describe("TipFeedback", () => {
  it("offers two labelled, pressable buttons in a labelled group, with no axe violations", async () => {
    const { container } = render(<TipFeedback tipId="purifier" language="en" />);
    expect(screen.getByRole("group", { name: "Was this tip useful?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Helpful" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "Not useful" }).getAttribute("aria-pressed")).toBe("false");
    expect((await axe(container)).violations).toEqual([]);
  });

  it("sends only {tipId, vote} once per vote, saves it on the device, and says exactly what was sent", async () => {
    const user = userEvent.setup();
    render(<TipFeedback tipId="purifier" language="en" />);
    await user.click(screen.getByRole("button", { name: "Helpful" }));
    expect(posted()).toEqual([{ tipId: "purifier", vote: "up" }]);
    expect(Object.keys(posted()[0]!)).toEqual(["tipId", "vote"]);
    expect((fetchMock.mock.calls[0]![1] as RequestInit).keepalive).toBe(true);
    expect(screen.getByRole("button", { name: "Helpful" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/Only the tip and your vote were sent/)).toBeTruthy();
    expect(JSON.parse(storage.getItem("smogsense:v1:feedback")!)).toEqual({ purifier: "up" });
  });

  it("switching the vote sends the new one; pressing the active button takes it back without sending", async () => {
    const user = userEvent.setup();
    render(<TipFeedback tipId="n95_mask" language="en" />);
    await user.click(screen.getByRole("button", { name: "Helpful" }));
    await user.click(screen.getByRole("button", { name: "Not useful" }));
    expect(posted()).toEqual([{ tipId: "n95_mask", vote: "up" }, { tipId: "n95_mask", vote: "down" }]);
    expect(screen.getByRole("button", { name: "Helpful" }).getAttribute("aria-pressed")).toBe("false");
    await user.click(screen.getByRole("button", { name: "Not useful" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Not useful" }).getAttribute("aria-pressed")).toBe("false");
    expect(JSON.parse(storage.getItem("smogsense:v1:feedback")!)).toEqual({});
    expect(screen.queryByText(/Only the tip and your vote/)).toBeNull();
  });

  it("remembers the vote after a reload without sending it again", async () => {
    const user = userEvent.setup();
    const first = render(<TipFeedback tipId="purifier" language="en" />);
    await user.click(screen.getByRole("button", { name: "Not useful" }));
    first.unmount();
    render(<TipFeedback tipId="purifier" language="en" />);
    expect((await screen.findByRole("button", { name: "Not useful" })).getAttribute("aria-pressed")).toBe("true");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps votes for different tips separate", async () => {
    const user = userEvent.setup();
    render(<><TipFeedback tipId="purifier" language="en" /><TipFeedback tipId="n95_mask" language="en" /></>);
    await user.click(screen.getAllByRole("button", { name: "Helpful" })[0]!);
    expect(screen.getAllByRole("button", { name: "Helpful" })[1]!.getAttribute("aria-pressed")).toBe("false");
    expect(JSON.parse(storage.getItem("smogsense:v1:feedback")!)).toEqual({ purifier: "up" });
  });

  it("never bothers the user when the network fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("network"));
    const user = userEvent.setup();
    render(<TipFeedback tipId="purifier" language="en" />);
    await user.click(screen.getByRole("button", { name: "Helpful" }));
    expect(screen.getByRole("button", { name: "Helpful" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders in Hindi with no axe violations", async () => {
    const { container } = render(<TipFeedback tipId="purifier" language="hi" />);
    expect(screen.getByRole("group", { name: "क्या यह सुझाव काम का था?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "काम का नहीं" })).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });
});
