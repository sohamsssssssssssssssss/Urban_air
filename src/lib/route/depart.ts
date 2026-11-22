const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 24 * 60 * 60_000;
const GRACE_MS = 60 * 60_000;

/**
 * Turns an `HH:MM` clock time (IST) into an ISO departure time. A time that has already passed
 * by more than an hour means tomorrow. Empty input means "now".
 * @param time - value of an `<input type="time">`
 * @param now - clock, injectable for tests
 */
export function departAtFromTime(time: string, now = Date.now()): string | undefined {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return undefined;
  const ist = new Date(now + IST_OFFSET_MS);
  let t = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), Number(m[1]), Number(m[2])) - IST_OFFSET_MS;
  if (t < now - GRACE_MS) t += DAY_MS;
  return new Date(t).toISOString();
}
