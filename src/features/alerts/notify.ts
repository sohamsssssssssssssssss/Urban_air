import { SERVICE_WORKER_URL } from "./constants";

export type PermissionState = NotificationPermission | "unsupported";

/** Current browser permission, or "unsupported" where the Notification API is missing. */
export function permissionState(): PermissionState {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
}

/** Registers the minimal service worker (needed for notifications on Android). Fails quietly where unsupported. */
export async function registerServiceWorker(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator)) return false;
    await navigator.serviceWorker.register(SERVICE_WORKER_URL);
    return true;
  } catch {
    return false;
  }
}

/**
 * Asks for notification permission. Call this ONLY from a user's click: SmogSense never asks on load.
 */
export async function requestPermission(): Promise<PermissionState> {
  if (permissionState() === "unsupported") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return permissionState();
  }
}

/**
 * Shows a notification if permission was granted: through the service worker when one is registered
 * (required on Android and in installed apps), otherwise with `new Notification`.
 * @returns whether a notification was shown
 */
export async function showNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (permissionState() !== "granted") return false;
  try {
    const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (registration) await registration.showNotification(title, { body, tag, icon: "/icon.svg" });
    else new Notification(title, { body, tag, icon: "/icon.svg" });
    return true;
  } catch {
    return false;
  }
}
