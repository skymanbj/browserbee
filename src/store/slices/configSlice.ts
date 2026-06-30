import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ProviderConfig } from '../../background/configManager';

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  maxTokens?: number;
  isReasoningModel?: boolean;
}

export interface ConfigState {
  providers: ProviderConfig[];
  activeProviderId: string | null;
  models: ModelConfig[];
  loading: boolean;
  error: string | null;
}

const initialState: ConfigState = {
  providers: [],
  activeProviderId: null,
  models: [],
  loading: false,
  error: null,
};

export const fetchConfig = createAsyncThunk(
  'config/fetchConfig',
  async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get('browserbee_config');
        return result.browserbee_config || { providers: [], activeProviderId: null, models: [] };
      }
    } catch (error) {
      console.warn('Failed to load config from storage:', error);
    }
    return { providers: [], activeProviderId: null, models: [] };
  }
);

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setProviders(state, action: PayloadAction<ProviderConfig[]>) {
      state.providers = action.payload;
    },
    setActiveProvider(state, action: PayloadAction<string | null>) {
      state.activeProviderId = action.payload;
    },
    setModels(state, action: PayloadAction<ModelConfig[]>) {
      state.models = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.providers = action.payload.providers || [];
        state.activeProviderId = action.payload.activeProviderId || null;
        state.models = action.payload.models || [];
      })
      .addCase(fetchConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load config';
      });
  },
});

export const { setProviders, setActiveProvider, setModels, setLoading, setError } = configSlice.actions;
export default configSlice.reducer;
