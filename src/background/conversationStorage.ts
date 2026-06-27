/**
 * Conversation Storage Service
 * 使用 chrome.storage.local 持久化保存历史会话
 */

import { logWithTimestamp } from './utils';

/** 单条消息 */
export interface SavedMessage {
  type: 'system' | 'llm' | 'screenshot';
  content: string;
  imageData?: string;
  mediaType?: string;
  timestamp: number;
}

/** 完整的已保存会话 */
export interface SavedConversation {
  id: string;
  title: string;
  messages: SavedMessage[];
  createdAt: number;
  updatedAt: number;
  provider: string;
  model: string;
}

/** 会话摘要（用于列表显示，不含完整消息） */
export interface ConversationSummary {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  provider: string;
  model: string;
}

// 存储 key 前缀
const STORAGE_PREFIX = 'conversation_';
// 会话索引 key
const INDEX_KEY = 'conversation_index';
// 最大保存数量
const MAX_CONVERSATIONS = 50;

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * 从消息中提取会话标题
 * 优先使用用户的第一条 prompt 作为标题
 */
function extractTitle(messages: SavedMessage[]): string {
  for (const msg of messages) {
    if (msg.type === 'system' && msg.content.startsWith('New prompt: "')) {
      const prompt = msg.content.substring('New prompt: "'.length);
      // 去掉尾部引号
      const cleaned = prompt.endsWith('"') ? prompt.slice(0, -1) : prompt;
      // 截取前50字符
      return cleaned.length > 50 ? cleaned.substring(0, 50) + '...' : cleaned;
    }
  }
  return `对话 ${new Date().toLocaleString('zh-CN')}`;
}

/**
 * 从消息中提取预览文本
 */
function extractPreview(messages: SavedMessage[]): string {
  // 找第一条 LLM 回复
  for (const msg of messages) {
    if (msg.type === 'llm' && msg.content) {
      const clean = msg.content.replace(/[#*`]/g, '').trim();
      return clean.length > 100 ? clean.substring(0, 100) + '...' : clean;
    }
  }
  return '（无回复内容）';
}

/**
 * 获取会话索引列表
 */
async function getIndex(): Promise<string[]> {
  const result = await chrome.storage.local.get({ [INDEX_KEY]: [] });
  return result[INDEX_KEY] || [];
}

/**
 * 更新会话索引列表
 */
async function setIndex(index: string[]): Promise<void> {
  await chrome.storage.local.set({ [INDEX_KEY]: index });
}

/**
 * 保存会话
 * 如果提供了 existingId，则更新已有会话；否则创建新会话
 */
export async function saveConversation(
  messages: SavedMessage[],
  provider: string,
  model: string,
  existingId?: string
): Promise<string> {
  try {
    // 过滤掉无意义的系统消息（如连接消息）
    const meaningfulMessages = messages.filter(m => {
      if (m.type === 'system') {
        // 保留用户 prompt 和有意义的系统消息
        if (m.content.startsWith('Connected to tab:')) return false;
        if (m.content.startsWith('Current page:')) return false;
        if (m.content.startsWith('Executing prompt:')) return false;
        if (m.content.startsWith('Initializing for tab')) return false;
        if (m.content.startsWith('Debug session was closed')) return false;
      }
      return true;
    });

    // 如果过滤后没有有意义的消息，跳过保存
    if (meaningfulMessages.length === 0) {
      logWithTimestamp('No meaningful messages to save, skipping');
      return '';
    }

    // 至少要有一条用户消息和一条 LLM 回复才保存
    const hasUserMsg = meaningfulMessages.some(m => 
      m.type === 'system' && m.content.startsWith('New prompt: "')
    );
    const hasLlmMsg = meaningfulMessages.some(m => m.type === 'llm');
    if (!hasUserMsg || !hasLlmMsg) {
      logWithTimestamp('Conversation has no user prompt or LLM reply, skipping save');
      return '';
    }

    const now = Date.now();
    const id = existingId || generateId();
    const title = extractTitle(meaningfulMessages);

    const conversation: SavedConversation = {
      id,
      title,
      messages: meaningfulMessages,
      createdAt: existingId ? (await getConversation(existingId))?.createdAt || now : now,
      updatedAt: now,
      provider,
      model,
    };

    // 存储完整会话数据
    await chrome.storage.local.set({ [STORAGE_PREFIX + id]: conversation });

    // 更新索引
    let index = await getIndex();

    if (existingId) {
      // 更新：移到最前面
      index = index.filter(i => i !== existingId);
    }
    index.unshift(id);

    // 超出上限时删除最旧的
    if (index.length > MAX_CONVERSATIONS) {
      const toRemove = index.splice(MAX_CONVERSATIONS);
      const keysToRemove = toRemove.map(i => STORAGE_PREFIX + i);
      await chrome.storage.local.remove(keysToRemove);
      logWithTimestamp(`Removed ${toRemove.length} old conversations to stay within limit`);
    }

    await setIndex(index);
    logWithTimestamp(`Conversation saved: ${id} (${title})`);
    return id;
  } catch (error) {
    logWithTimestamp(`Error saving conversation: ${error}`, 'error');
    return '';
  }
}

/**
 * 获取所有会话的摘要列表
 */
export async function getConversationList(): Promise<ConversationSummary[]> {
  try {
    const index = await getIndex();
    if (index.length === 0) return [];

    const keys = index.map(id => STORAGE_PREFIX + id);
    const result = await chrome.storage.local.get(keys);

    const summaries: ConversationSummary[] = [];
    for (const id of index) {
      const conv = result[STORAGE_PREFIX + id] as SavedConversation | undefined;
      if (conv) {
        summaries.push({
          id: conv.id,
          title: conv.title,
          preview: extractPreview(conv.messages),
          messageCount: conv.messages.length,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          provider: conv.provider,
          model: conv.model,
        });
      }
    }

    return summaries;
  } catch (error) {
    logWithTimestamp(`Error getting conversation list: ${error}`, 'error');
    return [];
  }
}

/**
 * 获取单条会话的完整数据
 */
export async function getConversation(id: string): Promise<SavedConversation | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_PREFIX + id);
    return (result[STORAGE_PREFIX + id] as SavedConversation) || null;
  } catch (error) {
    logWithTimestamp(`Error getting conversation ${id}: ${error}`, 'error');
    return null;
  }
}

/**
 * 删除单条会话
 */
export async function deleteConversation(id: string): Promise<boolean> {
  try {
    await chrome.storage.local.remove(STORAGE_PREFIX + id);

    const index = await getIndex();
    const newIndex = index.filter(i => i !== id);
    await setIndex(newIndex);

    logWithTimestamp(`Conversation deleted: ${id}`);
    return true;
  } catch (error) {
    logWithTimestamp(`Error deleting conversation ${id}: ${error}`, 'error');
    return false;
  }
}

/**
 * 删除所有会话
 */
export async function clearAllConversations(): Promise<boolean> {
  try {
    const index = await getIndex();
    const keysToRemove = [INDEX_KEY, ...index.map(id => STORAGE_PREFIX + id)];
    await chrome.storage.local.remove(keysToRemove);

    logWithTimestamp('All conversations cleared');
    return true;
  } catch (error) {
    logWithTimestamp(`Error clearing all conversations: ${error}`, 'error');
    return false;
  }
}

/**
 * 搜索会话（按标题和消息内容关键词）
 */
export async function searchConversations(keyword: string): Promise<ConversationSummary[]> {
  try {
    if (!keyword.trim()) return getConversationList();

    const lowerKeyword = keyword.toLowerCase();
    const index = await getIndex();
    if (index.length === 0) return [];

    const keys = index.map(id => STORAGE_PREFIX + id);
    const result = await chrome.storage.local.get(keys);

    const matches: ConversationSummary[] = [];
    for (const id of index) {
      const conv = result[STORAGE_PREFIX + id] as SavedConversation | undefined;
      if (!conv) continue;

      // 搜索标题
      if (conv.title.toLowerCase().includes(lowerKeyword)) {
        matches.push({
          id: conv.id,
          title: conv.title,
          preview: extractPreview(conv.messages),
          messageCount: conv.messages.length,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          provider: conv.provider,
          model: conv.model,
        });
        continue;
      }

      // 搜索消息内容
      const found = conv.messages.some(m =>
        m.content.toLowerCase().includes(lowerKeyword)
      );
      if (found) {
        matches.push({
          id: conv.id,
          title: conv.title,
          preview: extractPreview(conv.messages),
          messageCount: conv.messages.length,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          provider: conv.provider,
          model: conv.model,
        });
      }
    }

    return matches;
  } catch (error) {
    logWithTimestamp(`Error searching conversations: ${error}`, 'error');
    return [];
  }
}
