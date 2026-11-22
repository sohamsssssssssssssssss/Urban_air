const IST_FORMAT = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Formats an ISO timestamp in Indian Standard Time, e.g. "22 Nov, 17:00 IST".
 * @param iso - ISO 8601 timestamp
 */
export function formatIST(iso: string): string {
  return `${IST_FORMAT.format(new Date(iso))} IST`;
}
