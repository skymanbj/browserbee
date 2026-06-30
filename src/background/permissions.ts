/**
 * Permission helpers for runtime permission requests.
 *
 * BrowserBee now declares the minimum set of permissions in the manifest and
 * requests powerful/optional permissions (debugger, host access) only when
 * they are actually needed. This reduces the extension's default attack surface.
 */

/**
 * Check whether the debugger permission has been granted.
 */
export async function hasDebuggerPermission(): Promise<boolean> {
  try {
    const result = await chrome.permissions.contains({
      permissions: ["debugger"]
    });
    return result === true;
  } catch (error) {
    console.warn("[permissions] Error checking debugger permission:", error);
    return false;
  }
}

/**
 * Request the debugger permission from the user.
 * Returns true if the user granted it.
 */
export async function requestDebuggerPermission(): Promise<boolean> {
  try {
    const granted = await chrome.permissions.request({
      permissions: ["debugger"]
    });
    return granted === true;
  } catch (error) {
    console.warn("[permissions] Error requesting debugger permission:", error);
    return false;
  }
}

/**
 * Check whether we have host permission for a given URL.
 */
export async function hasHostPermission(url: string): Promise<boolean> {
  try {
    const granted = await chrome.permissions.contains({
      origins: [new URL(url).origin + "/*"]
    });
    return granted === true;
  } catch (error) {
    console.warn("[permissions] Error checking host permission:", error);
    return false;
  }
}

/**
 * Request host permission for a given URL from the user.
 * Returns true if the user granted it.
 */
export async function requestHostPermission(url: string): Promise<boolean> {
  try {
    const origin = new URL(url).origin + "/*";
    const granted = await chrome.permissions.request({
      origins: [origin]
    });
    return granted === true;
  } catch (error) {
    console.warn("[permissions] Error requesting host permission:", error);
    return false;
  }
}

/**
 * Ensure that we have permission to attach to/automate a tab.
 * This checks both debugger and host permissions and requests them if needed.
 *
 * @returns An object indicating whether the required permissions are granted.
 */
export async function ensurePermissionForTab(
  tab: chrome.tabs.Tab
): Promise<{ granted: true } | { granted: false; reason: string }> {
  if (!tab.url || !tab.id) {
    return { granted: false, reason: "Tab has no URL or ID." };
  }

  // Check debugger permission first (required by playwright-crx)
  const debuggerGranted = await hasDebuggerPermission();
  if (!debuggerGranted) {
    const requested = await requestDebuggerPermission();
    if (!requested) {
      return {
        granted: false,
        reason:
          "The debugger permission is required to automate the browser. Please grant it and try again."
      };
    }
  }

  // Then check host permission for the tab's URL. activeTab grants this
  // automatically when the user opens the side panel, but for tabs activated
  // via other means we request it explicitly.
  const url = tab.url;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const hostGranted = await hasHostPermission(url);
    if (!hostGranted) {
      const requested = await requestHostPermission(url);
      if (!requested) {
        return {
          granted: false,
          reason: `Host permission for ${new URL(url).hostname} is required to automate this page. Please grant it and try again.`
        };
      }
    }
  }

  return { granted: true };
}

/**
 * Send a permission-required notification to the UI so the user knows why
 * an operation failed and can take action.
 */
export function notifyPermissionRequired(
  reason: string,
  tabId?: number,
  windowId?: number
): void {
  try {
    chrome.runtime.sendMessage({
      action: "permissionRequired",
      reason,
      tabId,
      windowId
    });
  } catch (error) {
    console.warn("[permissions] Error sending permission-required message:", error);
  }
}
