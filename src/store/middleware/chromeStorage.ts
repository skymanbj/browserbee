import { type Middleware } from '@reduxjs/toolkit';

type ChromeStorageArea = chrome.storage.LocalStorageArea | chrome.storage.SyncStorageArea;

const getStorage = (namespace: 'local' | 'sync'): ChromeStorageArea | undefined => {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return undefined;
  }
  return namespace === 'local' ? chrome.storage.local : chrome.storage.sync;
};

const storageKey = (slice: string) => `browserbee_${slice}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const chromeStorageMiddleware: Middleware = (storeApi) => (next) => async (action: any) => {
  const result = next(action);

  const state = storeApi.getState() as {
    settings?: { theme?: string; language?: string; soul?: string };
    config?: { providers?: unknown[]; activeProviderId?: string | null; models?: unknown[] };
    memory?: { items?: unknown[] };
  };
  const storage = getStorage('local');

  if (!storage) {
    return result;
  }

  try {
    if (action.type === 'settings/setTheme') {
      await storage.set({ [storageKey('theme_mode')]: state.settings?.theme });
    } else if (action.type === 'settings/setLanguage') {
      await storage.set({ [storageKey('language')]: state.settings?.language });
    } else if (action.type === 'settings/setSoul') {
      await storage.set({ [storageKey('soul')]: state.settings?.soul });
    } else if (action.type === 'config/setProviders' || action.type === 'config/setActiveProvider' || action.type === 'config/setModels') {
      await storage.set({
        [storageKey('config')]: {
          providers: state.config?.providers,
          activeProviderId: state.config?.activeProviderId,
          models: state.config?.models,
        },
      });
    } else if (action.type === 'memory/setMemories') {
      await storage.set({ [storageKey('memories')]: state.memory?.items });
    }
  } catch (error) {
    console.warn('chromeStorageMiddleware failed:', error);
  }

  return result;
};
