import { configureStore } from '@reduxjs/toolkit';
import { chromeStorageMiddleware } from './middleware/chromeStorage';
import type { ConfigState } from './slices/configSlice';
import configReducer from './slices/configSlice';
import type { MemoryState } from './slices/memorySlice';
import memoryReducer from './slices/memorySlice';
import type { SettingsState } from './slices/settingsSlice';
import settingsReducer from './slices/settingsSlice';
import type { UiState } from './slices/uiSlice';
import uiReducer from './slices/uiSlice';

export interface RootState {
  settings: SettingsState;
  config: ConfigState;
  memory: MemoryState;
  ui: UiState;
}

export const makeStore = () => {
  return configureStore({
    reducer: {
      settings: settingsReducer,
      config: configReducer,
      memory: memoryReducer,
      ui: uiReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // 忽略这些 action 类型的序列化检查，因为 chrome.storage 回调会触发它们
          ignoredActions: ['settings/initializeFromStorage/fulfilled'],
        },
        thunk: true,
      }).concat(chromeStorageMiddleware as any),
    devTools: process.env.NODE_ENV !== 'production',
  });
};

export const store = makeStore();

export type AppDispatch = typeof store.dispatch;

export type AppStore = ReturnType<typeof makeStore>;
