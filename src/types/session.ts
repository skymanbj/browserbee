import { Message } from '../sidepanel/types';

// Generic message format that works with all providers (extracted from agentController)
export interface GenericMessage {
  role: string;
  content: string | any;
}

// Session data structure for chat history and context persistence (SidePanel)
export interface ChatSession {
  id: string;          // Unique session identifier
  title: string;       // Session display name
  createdAt: number;   // Timestamp
  updatedAt: number;   // Timestamp
  messages: Message[]; // Raw message history for the React UI MessageDisplay
  agentHistory: {
    originalRequest: GenericMessage | null;
    conversationHistory: GenericMessage[];
  };                   // Internal agent execution context for LLM prompts
}

// Session data structure for Options page session management
export interface SessionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokenCount?: number;
}

export interface Session {
  id: string;
  name: string;
  tabId: number;
  tabTitle: string;
  windowId?: number;
  url?: string;
  provider: string;
  modelId?: string;
  messages: SessionMessage[];
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  lastRunAt?: number;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
}

export interface SessionSummary {
  id: string;
  name: string;
  tabTitle: string;
  url?: string;
  provider: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  lastRunAt?: number;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
}

export interface CreateSessionInput {
  name?: string;
  tabId: number;
  tabTitle: string;
  windowId?: number;
  url?: string;
  provider: string;
  modelId?: string;
}

export interface UpdateSessionInput {
  name?: string;
  tabTitle?: string;
  url?: string;
  messages?: SessionMessage[];
  messageCount?: number;
  lastRunAt?: number;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
}

export const SESSION_STORAGE_KEY = 'browserbee_sessions';
export const MAX_SESSIONS = 100;

export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function createDefaultSession(input: CreateSessionInput): Session {
  const now = Date.now();
  return {
    id: generateSessionId(),
    name: input.name || `Session ${new Date(now).toLocaleString('zh-CN')}`,
    tabId: input.tabId,
    tabTitle: input.tabTitle,
    windowId: input.windowId,
    url: input.url,
    provider: input.provider,
    modelId: input.modelId,
    messages: [],
    messageCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}
