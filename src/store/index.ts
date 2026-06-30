import { configureStore } from '@reduxjs/toolkit';
import { chromeStorageMiddleware } from './middleware/chromeStorage';
import configReducer from './slices/configSlice';
import memoryReducer from './slices/memorySlice';
import settingsReducer from './slices/settingsSlice';
import uiReducer from './slices/uiSlice';

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
      }).concat(chromeStorageMiddleware),
    devTools: process.env.NODE_ENV !== 'production',
  });
};

export const store = makeStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export type AppStore = ReturnType<typeof makeStore>;
