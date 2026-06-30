import { BrowserAgent } from "../agent/AgentCore";

// Provider types
export type ProviderType = 'anthropic' | 'openai' | 'gemini' | 'ollama' | `openai-compatible:${string}`;

// Content block types for multimodal messages
export interface TextContentBlock {
  type: 'text';
  text: string;
}

export interface ImageContentBlock {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface PdfContentBlock {
  type: 'pdf';
  data: string;
  name: string;
}

export type ContentBlock = TextContentBlock | ImageContentBlock | PdfContentBlock;

// File attachment type (used in UI -> background communication)
export type AttachmentType = 'image' | 'pdf' | 'text';

export interface FileAttachment {
  id: string;
  name: string;
  type: AttachmentType;
  mimeType: string;
  data: string;
  size: number;
  thumbnail?: string;
}

// Agent status types
export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  ERROR = 'error'
}

// Agent status info
export interface AgentStatusInfo {
  status: AgentStatus;
  timestamp: number;
  lastHeartbeat: number;
}

// Message types
export interface ExecutePromptMessage {
  action: 'executePrompt';
  prompt: string;
  attachments?: FileAttachment[];
  tabId?: number;
  windowId?: number;
}

export interface CancelExecutionMessage {
  action: 'cancelExecution';
  tabId?: number;
  windowId?: number;
}

export interface ClearHistoryMessage {
  action: 'clearHistory';
  tabId?: number;
  windowId?: number;
}

export interface InitializeTabMessage {
  action: 'initializeTab';
  tabId: number;
  windowId?: number;
}

export interface SwitchToTabMessage {
  action: 'switchToTab';
  tabId: number;
  windowId?: number;
}

export interface GetTokenUsageMessage {
  action: 'getTokenUsage';
  tabId?: number;
  windowId?: number;
}

export interface ApprovalResponseMessage {
  action: 'approvalResponse';
  requestId: string;
  approved: boolean;
  tabId?: number;
  windowId?: number;
}

export interface ReflectAndLearnMessage {
  action: 'reflectAndLearn';
  tabId?: number;
  windowId?: number;
}

// UI Message types
export interface UpdateOutputMessage {
  action: 'updateOutput';
  content: {
    type: 'system' | 'llm' | 'screenshot';
    content: string;
    imageData?: string;
    mediaType?: string;
  };
  tabId?: number;
  windowId?: number;
}

export interface UpdateStreamingChunkMessage {
  action: 'updateStreamingChunk';
  content: {
    type: 'llm';
    content: string;
  };
  tabId?: number;
  windowId?: number;
}

export interface FinalizeStreamingSegmentMessage {
  action: 'finalizeStreamingSegment';
  content: {
    id: number;
    content: string;
  };
  tabId?: number;
  windowId?: number;
}

export interface StartNewSegmentMessage {
  action: 'startNewSegment';
  content: {
    id: number;
  };
  tabId?: number;
  windowId?: number;
}

export interface StreamingCompleteMessage {
  action: 'streamingComplete';
  content: null;
  tabId?: number;
  windowId?: number;
}

export interface ProcessingCompleteMessage {
  action: 'processingComplete';
  content: null;
  tabId?: number;
  windowId?: number;
}

export interface RateLimitMessage {
  action: 'rateLimit';
  content: {
    isRetrying: boolean;
  };
  tabId?: number;
  windowId?: number;
}

export interface FallbackStartedMessage {
  action: 'fallbackStarted';
  content: {
    message: string;
  };
  tabId?: number;
  windowId?: number;
}

export interface UpdateScreenshotMessage {
  action: 'updateScreenshot';
  content: {
    type: 'screenshot';
    content: string;
    imageData: string;
    mediaType: string;
  };
  tabId?: number;
  windowId?: number;
}

export interface TokenUsageUpdatedMessage {
  action: 'tokenUsageUpdated';
  content: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  tabId?: number;
  windowId?: number;
}

export interface ProviderConfigChangedMessage {
  action: 'providerConfigChanged';
  tabId?: number;
  windowId?: number;
}

export interface ForceResetPlaywrightMessage {
  action: 'forceResetPlaywright';
}

export interface RequestApprovalMessage {
  action: 'requestApproval';
  requestId: string;
  toolName: string;
  toolInput: string;
  reason: string;
  tabId?: number;
  windowId?: number;
}

export interface CheckAgentStatusMessage {
  action: 'checkAgentStatus';
  tabId?: number;
  windowId?: number;
}

export interface AgentStatusUpdateMessage {
  action: 'agentStatusUpdate';
  status: AgentStatus;
  timestamp: number;
  lastHeartbeat: number;
  tabId?: number;
  windowId?: number;
}

// Session message types
export interface SessionCreateMessage {
  action: 'sessionCreate';
  name?: string;
  tabId: number;
  tabTitle: string;
  windowId?: number;
  url?: string;
  provider: string;
  modelId?: string;
}

export interface SessionUpdateMessage {
  action: 'sessionUpdate';
  sessionId: string;
  name?: string;
  tabTitle?: string;
  url?: string;
}

export interface SessionDeleteMessage {
  action: 'sessionDelete';
  sessionId: string;
}

export interface SessionDeleteManyMessage {
  action: 'sessionDeleteMany';
  sessionIds: string[];
}

export interface SessionGetAllMessage {
  action: 'sessionGetAll';
}

export interface SessionGetByIdMessage {
  action: 'sessionGetById';
  sessionId: string;
}

export interface SessionRenameMessage {
  action: 'sessionRename';
  sessionId: string;
  name: string;
}

export interface SessionSearchMessage {
  action: 'sessionSearch';
  query: string;
}

export interface SessionExportMessage {
  action: 'sessionExport';
  sessionIds?: string[];
}

export interface SessionImportMessage {
  action: 'sessionImport';
  json: string;
}

export interface SessionGetStatsMessage {
  action: 'sessionGetStats';
}

export interface SessionClearAllMessage {
  action: 'sessionClearAll';
}

// ==================== Scheduled Task Message Types ====================

export interface ScheduledTaskCreateMessage {
  action: 'scheduledTaskCreate';
  task: import('../types/scheduledTask').CreateScheduledTaskInput;
}

export interface ScheduledTaskUpdateMessage {
  action: 'scheduledTaskUpdate';
  taskId: string;
  updates: import('../types/scheduledTask').UpdateScheduledTaskInput;
}

export interface ScheduledTaskDeleteMessage {
  action: 'scheduledTaskDelete';
  taskId: string;
}

export interface ScheduledTaskDeleteManyMessage {
  action: 'scheduledTaskDeleteMany';
  taskIds: string[];
}

export interface ScheduledTaskGetAllMessage {
  action: 'scheduledTaskGetAll';
}

export interface ScheduledTaskGetByIdMessage {
  action: 'scheduledTaskGetById';
  taskId: string;
}

export interface ScheduledTaskEnableMessage {
  action: 'scheduledTaskEnable';
  taskId: string;
}

export interface ScheduledTaskPauseMessage {
  action: 'scheduledTaskPause';
  taskId: string;
}

export interface ScheduledTaskRunNowMessage {
  action: 'scheduledTaskRunNow';
  taskId: string;
}

export interface ScheduledTaskExportMessage {
  action: 'scheduledTaskExport';
}

export interface ScheduledTaskImportMessage {
  action: 'scheduledTaskImport';
  json: string;
}

export interface ScheduledTaskGetLogsMessage {
  action: 'scheduledTaskGetLogs';
  taskId: string;
  limit?: number;
}

export interface ScheduledTaskGetStatsMessage {
  action: 'scheduledTaskGetStats';
}

// Scheduled task status broadcast (UI -> Background, or Background -> UI)
export interface ScheduledTaskStatusMessage {
  action: 'scheduledTaskStatus';
  content: {
    taskId: string;
    taskName: string;
    phase: 'started' | 'completed' | 'error';
    duration?: number;
    error?: string;
    timestamp: number;
  };
  tabId?: number;
  windowId?: number;
}

// Chat session management message types (for SidePanel)
export interface GetSessionsMessage {
  action: 'getSessions';
  tabId?: number;
  windowId?: number;
}

export interface CreateSessionMessage {
  action: 'createSession';
  title?: string;
  tabId?: number;
  windowId?: number;
}

export interface SetActiveSessionMessage {
  action: 'setActiveSession';
  sessionId: string;
  tabId?: number;
  windowId?: number;
}

export interface DeleteSessionMessage {
  action: 'deleteSession';
  sessionId: string;
  tabId?: number;
  windowId?: number;
}

export interface RenameSessionMessage {
  action: 'renameSession';
  sessionId: string;
  title: string;
  tabId?: number;
  windowId?: number;
}

export interface UpdateHistoryMessage {
  action: 'updateHistory';
  tabId: number;
  windowId?: number;
  originalRequest: any;
  conversationHistory: any[];
}

export type BackgroundMessage =
  | ExecutePromptMessage
  | CancelExecutionMessage
  | ClearHistoryMessage
  | InitializeTabMessage
  | SwitchToTabMessage
  | GetTokenUsageMessage
  | ApprovalResponseMessage
  | ReflectAndLearnMessage
  | TokenUsageUpdatedMessage
  | UpdateOutputMessage
  | ProviderConfigChangedMessage
  | ForceResetPlaywrightMessage
  | RequestApprovalMessage
  | CheckAgentStatusMessage
  | SessionCreateMessage
  | SessionUpdateMessage
  | SessionDeleteMessage
  | SessionDeleteManyMessage
  | SessionGetAllMessage
  | SessionGetByIdMessage
  | SessionRenameMessage
  | SessionSearchMessage
  | SessionExportMessage
  | SessionImportMessage
  | SessionGetStatsMessage
  | SessionClearAllMessage
  | ScheduledTaskCreateMessage
  | ScheduledTaskUpdateMessage
  | ScheduledTaskDeleteMessage
  | ScheduledTaskDeleteManyMessage
  | ScheduledTaskGetAllMessage
  | ScheduledTaskGetByIdMessage
  | ScheduledTaskEnableMessage
  | ScheduledTaskPauseMessage
  | ScheduledTaskRunNowMessage
  | ScheduledTaskExportMessage
  | ScheduledTaskImportMessage
  | ScheduledTaskGetLogsMessage
  | ScheduledTaskGetStatsMessage
  | ScheduledTaskStatusMessage
  | GetSessionsMessage
  | CreateSessionMessage
  | SetActiveSessionMessage
  | DeleteSessionMessage
  | RenameSessionMessage
  | UpdateHistoryMessage;

// New message types for enhanced tab management
export interface TabStatusChangedMessage {
  action: 'tabStatusChanged';
  status: 'attached' | 'detached';
  tabId: number;
  windowId?: number;
}

export interface TargetCreatedMessage {
  action: 'targetCreated';
  tabId: number;
  windowId?: number;
  targetInfo: {
    type: string;
    url: string;
  };
}

export interface TargetDestroyedMessage {
  action: 'targetDestroyed';
  tabId: number;
  windowId?: number;
  url: string;
}

export interface TargetChangedMessage {
  action: 'targetChanged';
  tabId: number;
  windowId?: number;
  url: string;
}

export interface TabTitleChangedMessage {
  action: 'tabTitleChanged';
  tabId: number;
  windowId?: number;
  title: string;
}

export interface PageDialogMessage {
  action: 'pageDialog';
  tabId: number;
  windowId?: number;
  dialogInfo: {
    type: string;
    message: string;
  };
}

export interface PageConsoleMessage {
  action: 'pageConsole';
  tabId: number;
  windowId?: number;
  consoleInfo: {
    type: string;
    text: string;
  };
}

export interface PageErrorMessage {
  action: 'pageError';
  tabId: number;
  windowId?: number;
  error: string;
}

export type UIMessage =
  | UpdateOutputMessage
  | UpdateStreamingChunkMessage
  | FinalizeStreamingSegmentMessage
  | StartNewSegmentMessage
  | StreamingCompleteMessage
  | ProcessingCompleteMessage
  | RateLimitMessage
  | FallbackStartedMessage
  | UpdateScreenshotMessage
  | TokenUsageUpdatedMessage
  | ProviderConfigChangedMessage
  | RequestApprovalMessage
  | TabStatusChangedMessage
  | TargetCreatedMessage
  | TargetDestroyedMessage
  | TargetChangedMessage
  | TabTitleChangedMessage
  | PageDialogMessage
  | PageConsoleMessage
  | PageErrorMessage
  | AgentStatusUpdateMessage;

// State types
export interface TabState {
  page: any;
  windowId?: number;
  title?: string;
}

// New interface for window state
export interface WindowState {
  agent: BrowserAgent | null;
}
