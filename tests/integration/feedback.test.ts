import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FACT_IDS } from "@/lib/impact/factIds";
import { POST } from "@/app/api/feedback/route";

let ipCounter = 0;
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/feedback", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${++ipCounter}`, "user-agent": "SecretBrowser/1.0", ...headers },
  });
let out: { mock: { calls: unknown[][] }; mockRestore: () => void };
const feedbackLines = () => out.mock.calls.map((c) => String(c[0])).filter((l) => l.includes("tip_feedback"));
beforeEach(() => {
  out = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
});
afterEach(() => out.mockRestore());

describe("POST /api/feedback", () => {
  it("204 with no body, and logs exactly one line containing only the tip id and the vote", async () => {
    const res = await POST(post({ tipId: "purifier", vote: "up" }, { "x-forwarded-for": "203.0.113.77", "user-agent": "SecretBrowser/1.0" }));
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(feedbackLines()).toEqual(['{"event":"tip_feedback","tipId":"purifier","vote":"up"}\n']);
  });

  it("never logs the IP address, user agent, headers or anything else about the sender", async () => {
    await POST(post({ tipId: "n95_mask", vote: "down" }, { "x-forwarded-for": "203.0.113.77", "user-agent": "SecretBrowser/1.0", cookie: "session=abc", referer: "http://localhost/?city=Delhi" }));
    const logged = out.mock.calls.map((c) => String(c[0])).join("");
    for (const secret of ["203.0.113.77", "SecretBrowser", "session=abc", "Delhi", "referer", "cookie"]) expect(logged).not.toContain(secret);
    expect(Object.keys(JSON.parse(feedbackLines()[0]!))).toEqual(["event", "tipId", "vote"]);
  });

  it.each(FACT_IDS.map((id) => [id]))("accepts the real tip id %s", async (tipId) => {
    expect((await POST(post({ tipId, vote: "up" }))).status).toBe(204);
  });

  it.each([
    ["an unknown tip id", { tipId: "made_up", vote: "up" }],
    ["a log-injection attempt in the tip id", { tipId: "purifier\n{\"event\":\"fake\"}", vote: "up" }],
    ["a very long tip id", { tipId: "x".repeat(5000), vote: "up" }],
    ["an unknown vote", { tipId: "purifier", vote: "meh" }],
    ["a numeric vote", { tipId: "purifier", vote: 1 }],
    ["a profile smuggled in", { tipId: "purifier", vote: "up", profile: { kids: true } }],
    ["extra identifying fields", { tipId: "purifier", vote: "up", email: "a@b.c" }],
    ["a missing vote", { tipId: "purifier" }],
    ["an empty object", {}],
    ["an array", [{ tipId: "purifier", vote: "up" }]],
    ["null", null],
  ])("400 for %s, without logging anything", async (_, bad) => {
    const res = await POST(post(bad));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
    expect(feedbackLines()).toEqual([]);
  });

  it("400 for malformed JSON and oversized bodies", async () => {
    expect((await POST(post("{nope"))).status).toBe(400);
    expect((await POST(post("x".repeat(20_000)))).status).toBe(400);
    expect(feedbackLines()).toEqual([]);
  });

  it("is rate-limited per IP: a burst gets 429 with Retry-After and is not logged", async () => {
    const headers = { "x-forwarded-for": "192.0.2.200" };
    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) statuses.push((await POST(post({ tipId: "purifier", vote: "up" }, headers))).status);
    expect(statuses.slice(0, 20).every((s) => s === 204)).toBe(true);
    expect(statuses.slice(20).every((s) => s === 429)).toBe(true);
    const limited = await POST(post({ tipId: "purifier", vote: "up" }, headers));
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(feedbackLines()).toHaveLength(20);
  });
});
