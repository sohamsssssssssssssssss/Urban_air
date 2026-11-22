import { describe, expect, it } from "vitest";
import { classifyAiError, shouldTryNextModel } from "@/lib/ai/failure";

describe("classifyAiError", () => {
  it.each([
    [{ status: 404, message: "models/gemini-2.5-flash-lite is no longer available to new users" }, "model"],
    [{ status: 429, message: "RESOURCE_EXHAUSTED" }, "quota"],
    [{ status: 500, message: "You exceeded your current quota" }, "quota"],
    [{ status: 401 }, "auth"],
    [{ status: 403 }, "auth"],
    [{ status: 400, message: "API key not valid. Please pass a valid API key." }, "auth"],
    [{ status: 400, message: "Request contains an invalid argument." }, "schema"],
    [{ name: "AbortError", message: "The operation was aborted" }, "timeout"],
    [{ name: "TimeoutError" }, "timeout"],
    [{ message: "request timed out" }, "timeout"],
    [{ status: 503 }, "other"],
    [new Error("socket closed"), "other"],
    [null, "other"],
    ["boom", "other"],
  ])("%j -> %s", (err, reason) => expect(classifyAiError(err)).toBe(reason));

  it("only retired models and exhausted quotas are worth another model", () => {
    expect(["model", "quota"].every((r) => shouldTryNextModel(r as "model"))).toBe(true);
    expect(["auth", "schema", "timeout", "other"].some((r) => shouldTryNextModel(r as "auth"))).toBe(false);
  });
});
