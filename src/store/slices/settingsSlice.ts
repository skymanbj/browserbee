import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Language = 'zh' | 'en';
export type ThemeMode = 'light' | 'dark';

export interface SettingsState {
  theme: ThemeMode;
  language: Language;
  soul: string;
  isInitialized: boolean;
}

interface SettingsLoadResult {
  theme: ThemeMode;
  language: Language;
  soul: string;
}

const initialState: SettingsState = {
  theme: 'dark',
  language: 'zh',
  soul: '',
  isInitialized: false,
};

export const initializeFromStorage = createAsyncThunk<
  SettingsLoadResult,
  void,
  { rejectValue: string }
>('settings/initializeFromStorage', async (_, { rejectWithValue }) => {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      const result = await chrome.storage.sync.get({
        browserbee_theme_mode: 'dark',
        browserbee_language: 'zh',
        browserbee_soul: '',
      });
      return {
        theme: (result.browserbee_theme_mode as ThemeMode) || 'dark',
        language: (result.browserbee_language as Language) || 'zh',
        soul: (result.browserbee_soul as string) || '',
      };
    }
  } catch (error) {
    console.warn('Failed to load settings from storage:', error);
  }

  if (typeof window !== 'undefined' && window.matchMedia) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return {
      theme: prefersDark ? 'dark' : 'light',
      language: 'zh',
      soul: '',
    };
  }

  return { theme: 'dark' as ThemeMode, language: 'zh' as Language, soul: '' as string };
});

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
    },
    setLanguage(state, action: PayloadAction<Language>) {
      state.language = action.payload;
    },
    setSoul(state, action: PayloadAction<string>) {
      state.soul = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initializeFromStorage.fulfilled, (state, action) => {
      state.theme = action.payload.theme;
      state.language = action.payload.language;
      state.soul = action.payload.soul;
      state.isInitialized = true;
    });
  },
});

export const { setTheme, setLanguage, setSoul } = settingsSlice.actions;
export default settingsSlice.reducer;
