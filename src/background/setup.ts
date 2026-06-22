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

  // If no callback is provided, return a Promise (in MV3, sendMessage returns a Promise if no callback is specified).
  try {
    const promise = _origSendMessage(message);
    if (promise && typeof promise.catch === "function") {
      return promise.catch((err: any) => {
        const msg = String(err?.message || err);
        if (
          msg.includes("Receiving end does not exist") ||
          msg.includes("Extension context invalidated") ||
          msg.includes("Could not establish connection")
        ) {
          // Swallow expected connection-related errors
          return;
        }
        // Re-throw other unexpected errors to allow calling sites to catch them
        throw err;
      });
    }
    // Guarantee a Promise is returned even if the original returned undefined (common in non-background contexts)
    return Promise.resolve(promise);
  } catch (err) {
    return Promise.reject(err);
  }
};
