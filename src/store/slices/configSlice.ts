import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OpenAICompatibleInstance } from '../../models/providers/openai-compatible';

export interface OllamaModel {
  id: string;
  name: string;
  contextWindow: number;
}

export interface ConfigState {
  provider: string;
  anthropicApiKey: string;
  anthropicBaseUrl: string;
  anthropicModelId: string;
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModelId: string;
  geminiApiKey: string;
  geminiBaseUrl: string;
  geminiModelId: string;
  ollamaApiKey: string;
  ollamaBaseUrl: string;
  ollamaModelId: string;
  ollamaCustomModels: OllamaModel[];
  thinkingBudgetTokens: number;
  openaiCompatibleInstances: OpenAICompatibleInstance[];
  selectedInstanceId: string | null;
  newInstance: { id: string; name: string };
  newModel: { id: string; name: string; isReasoningModel: boolean; contextWindow: number; maxTokens: number };
  newOllamaModel: { id: string; name: string; contextWindow: number };
  isSaving: boolean;
  saveStatus: string;
  loading: boolean;
  error: string | null;
}

const initialState: ConfigState = {
  provider: 'anthropic',
  anthropicApiKey: '',
  anthropicBaseUrl: '',
  anthropicModelId: 'claude-3-5-sonnet-20241022',
  openaiApiKey: '',
  openaiBaseUrl: '',
  openaiModelId: 'gpt-4o',
  geminiApiKey: '',
  geminiBaseUrl: '',
  geminiModelId: 'gemini-2.0-flash',
  ollamaApiKey: '',
  ollamaBaseUrl: '',
  ollamaModelId: 'llama3.1:8b',
  ollamaCustomModels: [],
  thinkingBudgetTokens: 0,
  openaiCompatibleInstances: [],
  selectedInstanceId: null,
  newInstance: { id: '', name: '' },
  newModel: { id: '', name: '', isReasoningModel: false, contextWindow: 0, maxTokens: 0 },
  newOllamaModel: { id: '', name: '', contextWindow: 32768 },
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
          provider: 'anthropic',
          anthropicApiKey: '',
          anthropicModelId: 'claude-3-5-sonnet-20241022',
          anthropicBaseUrl: '',
          openaiApiKey: '',
          openaiModelId: 'gpt-4o',
          openaiBaseUrl: '',
          geminiApiKey: '',
          geminiModelId: 'gemini-2.0-flash',
          geminiBaseUrl: '',
          ollamaApiKey: '',
          ollamaModelId: 'llama3.1:8b',
          ollamaBaseUrl: '',
          ollamaCustomModels: [],
          thinkingBudgetTokens: 0,
        });

        const localResult = await chrome.storage.local.get({ openaiCompatibleInstances: null });
        let currentInstances = localResult.openaiCompatibleInstances;
        if (!currentInstances || !Array.isArray(currentInstances)) {
          currentInstances = result.openaiCompatibleInstances || [];
        }

        return {
          provider: result.provider,
          anthropicApiKey: result.anthropicApiKey,
          anthropicBaseUrl: result.anthropicBaseUrl,
          anthropicModelId: result.anthropicModelId,
          openaiApiKey: result.openaiApiKey,
          openaiBaseUrl: result.openaiBaseUrl,
          openaiModelId: result.openaiModelId,
          geminiApiKey: result.geminiApiKey,
          geminiBaseUrl: result.geminiBaseUrl,
          geminiModelId: result.geminiModelId,
          ollamaApiKey: result.ollamaApiKey,
          ollamaBaseUrl: result.ollamaBaseUrl || '',
          ollamaModelId: result.ollamaModelId,
          ollamaCustomModels: result.ollamaCustomModels || [],
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
    setAnthropicApiKey(state, action: PayloadAction<string>) {
      state.anthropicApiKey = action.payload;
    },
    setAnthropicBaseUrl(state, action: PayloadAction<string>) {
      state.anthropicBaseUrl = action.payload;
    },
    setAnthropicModelId(state, action: PayloadAction<string>) {
      state.anthropicModelId = action.payload;
    },
    setOpenaiApiKey(state, action: PayloadAction<string>) {
      state.openaiApiKey = action.payload;
    },
    setOpenaiBaseUrl(state, action: PayloadAction<string>) {
      state.openaiBaseUrl = action.payload;
    },
    setOpenaiModelId(state, action: PayloadAction<string>) {
      state.openaiModelId = action.payload;
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
    setOllamaApiKey(state, action: PayloadAction<string>) {
      state.ollamaApiKey = action.payload;
    },
    setOllamaBaseUrl(state, action: PayloadAction<string>) {
      state.ollamaBaseUrl = action.payload;
    },
    setOllamaModelId(state, action: PayloadAction<string>) {
      state.ollamaModelId = action.payload;
    },
    setOllamaCustomModels(state, action: PayloadAction<OllamaModel[]>) {
      state.ollamaCustomModels = action.payload;
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
    setNewOllamaModel(state, action: PayloadAction<{ id: string; name: string; contextWindow: number }>) {
      state.newOllamaModel = action.payload;
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
        state.anthropicApiKey = action.payload.anthropicApiKey;
        state.anthropicBaseUrl = action.payload.anthropicBaseUrl;
        state.anthropicModelId = action.payload.anthropicModelId;
        state.openaiApiKey = action.payload.openaiApiKey;
        state.openaiBaseUrl = action.payload.openaiBaseUrl;
        state.openaiModelId = action.payload.openaiModelId;
        state.geminiApiKey = action.payload.geminiApiKey;
        state.geminiBaseUrl = action.payload.geminiBaseUrl;
        state.geminiModelId = action.payload.geminiModelId;
        state.ollamaApiKey = action.payload.ollamaApiKey;
        state.ollamaBaseUrl = action.payload.ollamaBaseUrl;
        state.ollamaModelId = action.payload.ollamaModelId;
        state.ollamaCustomModels = action.payload.ollamaCustomModels;
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
  setAnthropicApiKey,
  setAnthropicBaseUrl,
  setAnthropicModelId,
  setOpenaiApiKey,
  setOpenaiBaseUrl,
  setOpenaiModelId,
  setGeminiApiKey,
  setGeminiBaseUrl,
  setGeminiModelId,
  setOllamaApiKey,
  setOllamaBaseUrl,
  setOllamaModelId,
  setOllamaCustomModels,
  setThinkingBudgetTokens,
  setOpenaiCompatibleInstances,
  setSelectedInstanceId,
  setNewInstance,
  setNewModel,
  setNewOllamaModel,
  setIsSaving,
  setSaveStatus,
  setLoading,
  setError,
} = configSlice.actions;

export default configSlice.reducer;
