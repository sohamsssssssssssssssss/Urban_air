import type { AdviceResult } from "@/lib/ai/advisor";
import type { AQSnapshot } from "@/lib/aq/types";
import type { ChatTurn } from "@/lib/requests";
import type { Language, Location, UserProfile } from "@/lib/profile";

/** Error carrying the API's typed error code. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function ok(res: Response): Promise<Response> {
  if (res.ok) return res;
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  throw new ApiError(body?.error?.code ?? "INTERNAL", body?.error?.message ?? "Something went wrong.");
}

/** Fetches the live snapshot for a location. */
export async function fetchAir(location: Location): Promise<AQSnapshot> {
  const params = new URLSearchParams({ lat: String(location.lat), lon: String(location.lon) });
  if (location.city) params.set("city", location.city);
  const res = await ok(await fetch(`/api/air?${params}`));
  return ((await res.json()) as { snapshot: AQSnapshot }).snapshot;
}

/** Requests personalised advice. */
export async function fetchAdvice(location: Location, profile: UserProfile, language: Language): Promise<AdviceResult & { snapshot: AQSnapshot }> {
  const res = await ok(await fetch("/api/advice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location, profile, language }) }));
  return res.json();
}

/**
 * Streams a chat answer, calling `onText` with each decoded chunk.
 */
export async function streamChatAnswer(body: { location: Location; profile: UserProfile; language: Language; message: string; history: ChatTurn[] }, onText: (chunk: string) => void): Promise<void> {
  const res = await ok(await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onText(decoder.decode(value, { stream: true }));
  }
}
