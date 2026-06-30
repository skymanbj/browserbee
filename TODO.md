# TODO

## Goal: eliminate console errors (Receiving end does not exist / Extension context invalidated)

### Step 1

- [x] Update `src/background/utils.ts` to make `sendUIMessage` always use a callback + swallow/only warn on expected `chrome.runtime.lastError` cases.

### Step 2

- [x] Strengthen `src/background/setup.ts` monkey-patch to also guard against lastError / non-promise return paths.

### Step 3

- [x] Harden `src/sidepanel/hooks/useChromeMessaging.ts` message listener response handling with try/catch + safer return behavior to reduce invalidated-context noise.

### Step 4

- [x] Run `npm test` and `npm run lint` (if available) to verify.
