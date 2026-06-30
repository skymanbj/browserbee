import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AgentMemory } from '../../tracking/memoryService';

export interface MemoryState {
  items: AgentMemory[];
  selectedIds: number[];
  filter: {
    search: string;
    type: 'all' | 'prebuilt' | 'user';
  };
  loading: boolean;
  error: string | null;
}

const initialState: MemoryState = {
  items: [],
  selectedIds: [],
  filter: {
    search: '',
    type: 'all',
  },
  loading: false,
  error: null,
};

export const fetchMemories = createAsyncThunk(
  'memory/fetchMemories',
  async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get('browserbee_memories');
        return result.browserbee_memories || [];
      }
    } catch (error) {
      console.warn('Failed to load memories from storage:', error);
    }
    return [];
  }
);

const memorySlice = createSlice({
  name: 'memory',
  initialState,
  reducers: {
    setMemories(state, action: PayloadAction<AgentMemory[]>) {
      state.items = action.payload;
    },
    setSelectedIds(state, action: PayloadAction<number[]>) {
      state.selectedIds = action.payload;
    },
    toggleSelectId(state, action: PayloadAction<number>) {
      const id = action.payload;
      const index = state.selectedIds.indexOf(id);
      if (index >= 0) {
        state.selectedIds.splice(index, 1);
      } else {
        state.selectedIds.push(id);
      }
    },
    setFilter(state, action: PayloadAction<{ search?: string; type?: 'all' | 'prebuilt' | 'user' }>) {
      state.filter = { ...state.filter, ...action.payload };
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
      .addCase(fetchMemories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMemories.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchMemories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load memories';
      });
  },
});

export const {
  setMemories,
  setSelectedIds,
  toggleSelectId,
  setFilter,
  setLoading,
  setError,
} = memorySlice.actions;
export default memorySlice.reducer;
