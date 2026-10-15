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
 * Only the debugger permission is checked: host access is declared statically in
 * the manifest and is granted at install time, so no per-tab request is needed.
 *
 * @returns An object indicating whether the required permissions are granted.
 */
export async function ensurePermissionForTab(
  tab: chrome.tabs.Tab
): Promise<{ granted: true } | { granted: false; reason: string }> {
  if (!tab.url || !tab.id) {
    return { granted: false, reason: "Tab has no URL or ID." };
  }

  // Debugger is declared as a required permission in the manifest because MV3
  // does not allow it to be optional. It is therefore granted at install time.
  // We still perform a sanity check here in case the permission is ever revoked.
  const debuggerGranted = await hasDebuggerPermission();
  if (!debuggerGranted) {
    return {
      granted: false,
      reason:
        "The debugger permission is required to automate the browser. Please re-enable the extension and try again."
    };
  }

  // Host access is declared statically in the manifest (`https://*/*` and
  // `http://*/*`), so Chrome grants it at install time and it never needs a
  // per-tab runtime request. We intentionally do NOT call
  // chrome.permissions.request() here: doing so popped a browser permission
  // prompt (and the "Permission required" banner) for every page the agent
  // touched. Automation now proceeds without that per-page confirmation.
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
