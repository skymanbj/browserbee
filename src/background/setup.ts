/**
 * Service Worker polyfills and global patches.
 * MUST be imported as the FIRST import in every bundle entry point.
 *
 * 1. Polyfill `window` for Vite's __vitePreload which uses window.dispatchEvent
 *    in dynamic import error handling — not available in service workers.
 * 2. Patch chrome.runtime.sendMessage to prevent
 *    "Could not establish connection. Receiving end does not exist." errors.
 */

// Polyfill `window` in service worker context (Vite's __vitePreload needs window.dispatchEvent)
if (typeof window === "undefined") {
  (globalThis as any).window = {
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { href: "" },
    process: undefined,
    console: console,
    Buffer: undefined,
    crypto: typeof crypto !== "undefined" ? crypto : undefined,
  };
}

const _origSendMessage = (chrome.runtime.sendMessage as Function).bind(
  chrome.runtime,
);
(chrome.runtime as any).sendMessage = function (
  message: any,
  callback?: Function,
): any {
  // If caller provides callback, let it handle lastError.
  if (typeof callback === "function") {
    return _origSendMessage(message, callback);
  }

  // Wrap in callback to ensure lastError doesn't surface as an unhandled rejection.
  try {
    return _origSendMessage(message, () => {
      // Swallow expected shutdown/teardown errors silently.
      const err = chrome.runtime.lastError;
      if (!err) return;
      const msg = String(err.message || err);
      if (
        msg.includes("Receiving end does not exist") ||
        msg.includes("Extension context invalidated") ||
        msg.includes("Could not establish connection")
      ) {
        return;
      }
      // For unexpected errors, still avoid throwing.
      return;
    });
  } catch {
    // Fallback to promise-based swallow.
    const result = _origSendMessage(message);
    if (result && typeof result.catch === "function") {
      return result.catch(() => undefined);
    }
    return result;
  }
};
