import { Session } from '../types/session';
import { Message } from '../sidepanel/types';

export class SessionManager {
  private static STORAGE_KEY = 'browserbee_chat_sessions';
  private static ACTIVE_SESSION_KEY_PREFIX = 'browserbee_active_session_';

  /**
   * Get all chat sessions, sorted by updatedAt descending (newest first)
   */
  static async getAllSessions(): Promise<Session[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get(this.STORAGE_KEY, (result) => {
        const sessions = (result[this.STORAGE_KEY] || []) as Session[];
        // Sort sessions by updatedAt descending
        sessions.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(sessions);
      });
    });
  }

  /**
   * Save all chat sessions to chrome.storage.local
   */
  static async saveAllSessions(sessions: Session[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.STORAGE_KEY]: sessions }, () => {
        resolve();
      });
    });
  }

  /**
   * Get a specific session by its ID
   */
  static async getSession(sessionId: string): Promise<Session | null> {
    const sessions = await this.getAllSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  /**
   * Create a new session
   */
  static async createSession(title: string = '新会话'): Promise<Session> {
    const newSession: Session = {
      id: 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      agentHistory: {
        originalRequest: null,
        conversationHistory: []
      }
    };

    const sessions = await this.getAllSessions();
    sessions.unshift(newSession); // Insert at the beginning
    await this.saveAllSessions(sessions);
    return newSession;
  }

  /**
   * Update the messages, agentHistory, and optional title of a session
   */
  static async updateSession(
    sessionId: string,
    messages: Message[],
    agentHistory: Session['agentHistory'],
    title?: string
  ): Promise<Session | null> {
    const sessions = await this.getAllSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    
    if (index === -1) {
      return null;
    }

    const session = sessions[index];
    session.messages = messages;
    session.agentHistory = agentHistory;
    session.updatedAt = Date.now();

    if (title) {
      session.title = title;
    } else if (session.title === '新会话' || session.title === '') {
      // Auto-generate title from the first user prompt if it was a default title
      const firstPromptMessage = messages.find(m => 
        m.type === 'system' && 
        m.content.startsWith('New prompt: "') && 
        m.content.endsWith('"')
      );
      
      if (firstPromptMessage) {
        // Extract the prompt text
        const promptContent = firstPromptMessage.content;
        const match = promptContent.match(/^New prompt: "([\s\S]*?)"$/);
        if (match && match[1]) {
          const rawText = match[1].trim();
          session.title = rawText.length > 25 ? rawText.substring(0, 25) + '...' : rawText;
        }
      }
    }

    await this.saveAllSessions(sessions);
    return session;
  }

  /**
   * Delete a session by its ID
   */
  static async deleteSession(sessionId: string): Promise<void> {
    let sessions = await this.getAllSessions();
    sessions = sessions.filter(s => s.id !== sessionId);
    await this.saveAllSessions(sessions);
  }

  /**
   * Get the active session ID for a specific window
   */
  static async getActiveSessionId(windowId?: number | null): Promise<string | null> {
    const wId = windowId || 0;
    const key = `${this.ACTIVE_SESSION_KEY_PREFIX}${wId}`;
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] || null);
      });
    });
  }

  /**
   * Set the active session ID for a specific window
   */
  static async setActiveSessionId(windowId: number | null | undefined, sessionId: string | null): Promise<void> {
    const wId = windowId || 0;
    const key = `${this.ACTIVE_SESSION_KEY_PREFIX}${wId}`;
    return new Promise((resolve) => {
      if (sessionId) {
        chrome.storage.local.set({ [key]: sessionId }, () => {
          resolve();
        });
      } else {
        chrome.storage.local.remove(key, () => {
          resolve();
        });
      }
    });
  }
}
