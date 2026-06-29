import { Message } from '../sidepanel/types';
import { ProviderType } from '../background/types';

// Generic message format that works with all providers (extracted from agentController)
export interface GenericMessage {
  role: string;
  content: string | any;
}

// Session data structure for chat history and context persistence
export interface Session {
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
