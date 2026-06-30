import { CreateSessionInput, MAX_SESSIONS, SESSION_STORAGE_KEY, Session, SessionMessage, SessionSummary, UpdateSessionInput, createDefaultSession } from '../types/session';
import { logWithTimestamp } from './utils';

export class SessionService {
  private static instance: SessionService;
  private sessions: Map<string, Session> = new Map();
  private initialized = false;

  private constructor() {}

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    await this.loadFromStorage();
    this.initialized = true;
    logWithTimestamp('SessionService initialized');
  }

  // --- CRUD ---

  public async getAll(): Promise<SessionSummary[]> {
    await this.ensureInitialized();
    const summaries: SessionSummary[] = [];
    this.sessions.forEach(session => {
      summaries.push(this.toSummary(session));
    });
    // Sort by updatedAt descending
    summaries.sort((a, b) => b.updatedAt - a.updatedAt);
    return summaries;
  }

  public async getById(id: string): Promise<Session | null> {
    await this.ensureInitialized();
    return this.sessions.get(id) || null;
  }

  public async create(input: CreateSessionInput): Promise<Session> {
    await this.ensureInitialized();
    const session = createDefaultSession(input);
    this.sessions.set(session.id, session);
    await this.enforceLimit();
    await this.persist();
    logWithTimestamp(`Session created: ${session.id} - "${session.name}"`);
    return session;
  }

  public async update(id: string, input: UpdateSessionInput): Promise<Session | null> {
    await this.ensureInitialized();
    const session = this.sessions.get(id);
    if (!session) return null;

    if (input.name !== undefined) session.name = input.name;
    if (input.tabTitle !== undefined) session.tabTitle = input.tabTitle;
    if (input.url !== undefined) session.url = input.url;
    if (input.messages !== undefined) {
      session.messages = input.messages;
      session.messageCount = input.messages.length;
    }
    if (input.messageCount !== undefined) session.messageCount = input.messageCount;
    if (input.lastRunAt !== undefined) session.lastRunAt = input.lastRunAt;
    if (input.tokenUsage !== undefined) session.tokenUsage = input.tokenUsage;
    session.updatedAt = Date.now();

    this.sessions.set(id, session);
    await this.persist();
    return session;
  }

  public async delete(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const existed = this.sessions.delete(id);
    if (existed) {
      await this.persist();
      logWithTimestamp(`Session deleted: ${id}`);
    }
    return existed;
  }

  public async deleteMany(ids: string[]): Promise<number> {
    await this.ensureInitialized();
    let count = 0;
    for (const id of ids) {
      if (this.sessions.delete(id)) count++;
    }
    if (count > 0) {
      await this.persist();
      logWithTimestamp(`Deleted ${count} sessions`);
    }
    return count;
  }

  public async clearAll(): Promise<void> {
    await this.ensureInitialized();
    this.sessions.clear();
    await this.persist();
    logWithTimestamp('All sessions cleared');
  }

  // --- Session-specific operations ---

  public async addMessage(sessionId: string, message: SessionMessage): Promise<Session | null> {
    await this.ensureInitialized();
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.messages.push(message);
    session.messageCount = session.messages.length;
    session.updatedAt = Date.now();
    session.lastRunAt = Date.now();

    this.sessions.set(sessionId, session);
    await this.persist();
    return session;
  }

  public async updateMessage(sessionId: string, index: number, content: string): Promise<Session | null> {
    await this.ensureInitialized();
    const session = this.sessions.get(sessionId);
    if (!session || index < 0 || index >= session.messages.length) return null;

    session.messages[index].content = content;
    session.updatedAt = Date.now();
    this.sessions.set(sessionId, session);
    await this.persist();
    return session;
  }

  public async rename(id: string, newName: string): Promise<Session | null> {
    return this.update(id, { name: newName });
  }

  // --- Search ---

  public async search(query: string): Promise<SessionSummary[]> {
    await this.ensureInitialized();
    const lowerQuery = query.toLowerCase();
    const results: SessionSummary[] = [];

    this.sessions.forEach(session => {
      if (
        session.name.toLowerCase().includes(lowerQuery) ||
        session.tabTitle.toLowerCase().includes(lowerQuery) ||
        (session.url && session.url.toLowerCase().includes(lowerQuery)) ||
        session.messages.some(m => m.content.toLowerCase().includes(lowerQuery))
      ) {
        results.push(this.toSummary(session));
      }
    });

    results.sort((a, b) => b.updatedAt - a.updatedAt);
    return results;
  }

  // --- Export / Import ---

  public async exportToJson(sessionIds?: string[]): Promise<string> {
    await this.ensureInitialized();
    let sessions: Session[];
    if (sessionIds && sessionIds.length > 0) {
      sessions = sessionIds.map(id => this.sessions.get(id)).filter(Boolean) as Session[];
    } else {
      sessions = Array.from(this.sessions.values());
    }
    return JSON.stringify({ version: 1, exportedAt: Date.now(), sessions }, null, 2);
  }

  public async importFromJson(json: string): Promise<{ imported: number; skipped: number }> {
    await this.ensureInitialized();
    const result = { imported: 0, skipped: 0 };
    try {
      const data = JSON.parse(json);
      if (!data.sessions || !Array.isArray(data.sessions)) {
        throw new Error('Invalid format: sessions array required');
      }
      for (const sessionData of data.sessions) {
        if (!sessionData.id || !sessionData.name || !sessionData.messages) {
          result.skipped++;
          continue;
        }
        if (this.sessions.has(sessionData.id)) {
          result.skipped++;
          continue;
        }
        const session: Session = {
          id: sessionData.id,
          name: sessionData.name,
          tabId: sessionData.tabId || 0,
          tabTitle: sessionData.tabTitle || '',
          windowId: sessionData.windowId,
          url: sessionData.url,
          provider: sessionData.provider || 'unknown',
          modelId: sessionData.modelId,
          messages: sessionData.messages || [],
          messageCount: sessionData.messages?.length || 0,
          createdAt: sessionData.createdAt || Date.now(),
          updatedAt: sessionData.updatedAt || Date.now(),
          lastRunAt: sessionData.lastRunAt,
          tokenUsage: sessionData.tokenUsage,
        };
        this.sessions.set(session.id, session);
        result.imported++;
      }
      if (result.imported > 0) {
        await this.enforceLimit();
        await this.persist();
      }
    } catch (error: any) {
      logWithTimestamp(`Session import failed: ${error.message}`, 'error');
      throw error;
    }
    return result;
  }

  // --- Stats ---

  public async getStats(): Promise<{
    total: number;
    totalMessages: number;
    totalTokens: number;
  }> {
    await this.ensureInitialized();
    let totalMessages = 0;
    let totalTokens = 0;
    this.sessions.forEach(session => {
      totalMessages += session.messages.length;
      if (session.tokenUsage) {
        totalTokens += session.tokenUsage.total;
      }
    });
    return {
      total: this.sessions.size,
      totalMessages,
      totalTokens,
    };
  }

  // --- Current session tracking ---

  private windowCurrentSessionIds: Map<number, string> = new Map();
  private defaultCurrentSessionId: string | null = null;

  public getCurrentSessionId(windowId?: number): string | null {
    if (windowId === undefined || windowId === null) {
      return this.defaultCurrentSessionId;
    }
    return this.windowCurrentSessionIds.get(windowId) || null;
  }

  public setCurrentSessionId(id: string | null, windowId?: number): void {
    if (windowId === undefined || windowId === null) {
      this.defaultCurrentSessionId = id;
    } else {
      if (id) {
        this.windowCurrentSessionIds.set(windowId, id);
      } else {
        this.windowCurrentSessionIds.delete(windowId);
      }
    }
  }

  public async getOrCreateCurrentSession(input: CreateSessionInput): Promise<Session> {
    const windowId = input.windowId;
    const currentSessionId = this.getCurrentSessionId(windowId);
    if (currentSessionId && this.sessions.has(currentSessionId)) {
      const existing = this.sessions.get(currentSessionId)!;
      // Update tab info in case it changed
      existing.tabId = input.tabId;
      existing.tabTitle = input.tabTitle;
      existing.url = input.url || existing.url;
      existing.windowId = input.windowId || existing.windowId;
      this.sessions.set(existing.id, existing);
      return existing;
    }
    const session = await this.create(input);
    this.setCurrentSessionId(session.id, windowId);
    return session;
  }

  // --- Private helpers ---

  private toSummary(session: Session): SessionSummary {
    return {
      id: session.id,
      name: session.name,
      tabTitle: session.tabTitle,
      url: session.url,
      provider: session.provider,
      messageCount: session.messages.length,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      lastRunAt: session.lastRunAt,
      tokenUsage: session.tokenUsage,
    };
  }

  private async enforceLimit(): Promise<void> {
    if (this.sessions.size <= MAX_SESSIONS) return;
    // Sort by updatedAt ascending and remove oldest
    const sorted = Array.from(this.sessions.entries())
      .sort(([, a], [, b]) => a.updatedAt - b.updatedAt);
    const toRemove = this.sessions.size - MAX_SESSIONS;
    for (let i = 0; i < toRemove; i++) {
      this.sessions.delete(sorted[i][0]);
    }
    logWithTimestamp(`Enforced session limit: removed ${toRemove} oldest sessions`);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(SESSION_STORAGE_KEY);
      const data = result[SESSION_STORAGE_KEY];
      if (data && Array.isArray(data)) {
        this.sessions.clear();
        for (const session of data) {
          this.sessions.set(session.id, session);
        }
        logWithTimestamp(`Loaded ${data.length} sessions from storage`);
      }
    } catch (error: any) {
      logWithTimestamp(`Failed to load sessions: ${error.message}`, 'error');
    }
  }

  private async persist(): Promise<void> {
    try {
      const data = Array.from(this.sessions.values());
      await chrome.storage.local.set({ [SESSION_STORAGE_KEY]: data });
    } catch (error: any) {
      logWithTimestamp(`Failed to persist sessions: ${error.message}`, 'error');
    }
  }
}