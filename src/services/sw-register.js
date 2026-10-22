/**
 * Registers the service worker. The worker must never call skipWaiting() on its own.
 */
export function registerServiceWorker() {
  if (typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  try {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  } catch {
    // Best-effort only.
  }
}
