import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UiState {
  sidebarOpen: boolean;
  activeTab: string;
  modals: {
    memoryEdit: boolean;
    promptTemplateEdit: boolean;
    scheduledTaskEdit: boolean;
    memoryDeleteConfirm: boolean;
  };
}

const initialState: UiState = {
  sidebarOpen: true,
  activeTab: 'general',
  modals: {
    memoryEdit: false,
    promptTemplateEdit: false,
    scheduledTaskEdit: false,
    memoryDeleteConfirm: false,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setActiveTab(state, action: PayloadAction<string>) {
      state.activeTab = action.payload;
    },
    openModal(state, action: PayloadAction<keyof UiState['modals']>) {
      state.modals[action.payload] = true;
    },
    closeModal(state, action: PayloadAction<keyof UiState['modals']>) {
      state.modals[action.payload] = false;
    },
    closeAllModals(state) {
      state.modals = {
        memoryEdit: false,
        promptTemplateEdit: false,
        scheduledTaskEdit: false,
        memoryDeleteConfirm: false,
      };
    },
  },
});

export const {
  setSidebarOpen,
  toggleSidebar,
  setActiveTab,
  openModal,
  closeModal,
  closeAllModals,
} = uiSlice.actions;
export default uiSlice.reducer;
