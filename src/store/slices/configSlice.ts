import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OpenAICompatibleInstance } from '../../models/providers/openai-compatible';

export interface ConfigState {
  provider: string;
  geminiApiKey: string;
  geminiBaseUrl: string;
  geminiModelId: string;
  thinkingBudgetTokens: number;
  openaiCompatibleInstances: OpenAICompatibleInstance[];
  selectedInstanceId: string | null;
  newInstance: { id: string; name: string };
  newModel: { id: string; name: string; isReasoningModel: boolean; contextWindow: number; maxTokens: number };
  isSaving: boolean;
  saveStatus: string;
  loading: boolean;
  error: string | null;
}

const initialState: ConfigState = {
  provider: 'gemini',
  geminiApiKey: '',
  geminiBaseUrl: '',
  geminiModelId: 'gemini-2.0-flash',
  thinkingBudgetTokens: 0,
  openaiCompatibleInstances: [],
  selectedInstanceId: null,
  newInstance: { id: '', name: '' },
  newModel: { id: '', name: '', isReasoningModel: false, contextWindow: 0, maxTokens: 0 },
  isSaving: false,
  saveStatus: '',
  loading: false,
  error: null,
};

export const fetchConfig = createAsyncThunk(
  'config/fetchConfig',
  async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const result = await chrome.storage.sync.get({
          provider: 'gemini',
          geminiApiKey: '',
          geminiModelId: 'gemini-2.0-flash',
          geminiBaseUrl: '',
          thinkingBudgetTokens: 0,
        });

        const localResult = await chrome.storage.local.get({ openaiCompatibleInstances: null });
        let currentInstances = localResult.openaiCompatibleInstances;
        if (!currentInstances || !Array.isArray(currentInstances)) {
          currentInstances = result.openaiCompatibleInstances || [];
        }

        return {
          provider: result.provider,
          geminiApiKey: result.geminiApiKey,
          geminiBaseUrl: result.geminiBaseUrl || '',
          geminiModelId: result.geminiModelId,
          thinkingBudgetTokens: result.thinkingBudgetTokens || 0,
          openaiCompatibleInstances: currentInstances || [],
        };
      }
    } catch (error) {
      console.warn('Failed to load config from storage:', error);
    }
    return initialState;
  }
);

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setProvider(state, action: PayloadAction<string>) {
      state.provider = action.payload;
    },
    setGeminiApiKey(state, action: PayloadAction<string>) {
      state.geminiApiKey = action.payload;
    },
    setGeminiBaseUrl(state, action: PayloadAction<string>) {
      state.geminiBaseUrl = action.payload;
    },
    setGeminiModelId(state, action: PayloadAction<string>) {
      state.geminiModelId = action.payload;
    },
    setThinkingBudgetTokens(state, action: PayloadAction<number>) {
      state.thinkingBudgetTokens = action.payload;
    },
    setOpenaiCompatibleInstances(state, action: PayloadAction<OpenAICompatibleInstance[]>) {
      state.openaiCompatibleInstances = action.payload;
    },
    setSelectedInstanceId(state, action: PayloadAction<string | null>) {
      state.selectedInstanceId = action.payload;
    },
    setNewInstance(state, action: PayloadAction<{ id: string; name: string }>) {
      state.newInstance = action.payload;
    },
    setNewModel(state, action: PayloadAction<{ id: string; name: string; isReasoningModel: boolean; contextWindow: number; maxTokens: number }>) {
      state.newModel = action.payload;
    },
    setIsSaving(state, action: PayloadAction<boolean>) {
      state.isSaving = action.payload;
    },
    setSaveStatus(state, action: PayloadAction<string>) {
      state.saveStatus = action.payload;
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
        state.provider = action.payload.provider;
        state.geminiApiKey = action.payload.geminiApiKey;
        state.geminiBaseUrl = action.payload.geminiBaseUrl;
        state.geminiModelId = action.payload.geminiModelId;
        state.thinkingBudgetTokens = action.payload.thinkingBudgetTokens;
        state.openaiCompatibleInstances = action.payload.openaiCompatibleInstances;
      })
      .addCase(fetchConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load config';
      });
  },
});

export const {
  setProvider,
  setGeminiApiKey,
  setGeminiBaseUrl,
  setGeminiModelId,
  setThinkingBudgetTokens,
  setOpenaiCompatibleInstances,
  setSelectedInstanceId,
  setNewInstance,
  setNewModel,
  setIsSaving,
  setSaveStatus,
  setLoading,
  setError,
} = configSlice.actions;

export default configSlice.reducer;
