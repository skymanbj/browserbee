/**
 * Prompt Template type definitions
 *
 * A PromptTemplate is a reusable prompt instruction that users can save,
 * organize, and quickly apply in the SidePanel input.
 *
 * Variables in the prompt text are denoted as {{variableName}} and will be
 * replaced with user-supplied values at use time.
 */

export interface PromptTemplate {
  /** Unique identifier (e.g. "prompt_1689000000000") */
  id: string;

  /** Human-readable short name displayed in the UI (e.g. "📝 页面总结") */
  name: string;

  /** The actual prompt instruction. May contain {{variableName}} placeholders */
  prompt: string;

  /** Optional category for grouping (e.g. "写作", "编程", "翻译", "通用") */
  category?: string;

  /** When the template was created (timestamp) */
  createdAt: number;

  /** When the template was last modified (timestamp). Same as createdAt initially */
  updatedAt: number;

  /** Whether this is a built-in template that cannot be deleted */
  isBuiltIn?: boolean;
}

/**
 * Storage key used in chrome.storage.local
 */
export const STORAGE_KEY = 'browserbee_prompt_templates';

/**
 * Built-in default templates shipped with the extension.
 * These are read-only (isBuiltIn: true) and re-imported on first load.
 */
export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'default_summary',
    name: '📝 页面总结',
    prompt: '总结当前页面的主要内容，列出核心要点。',
    category: '通用',
    createdAt: 0,
    updatedAt: 0,
    isBuiltIn: true,
  },
  {
    id: 'default_table',
    name: '📊 提取表格',
    prompt: '将当前页面上的关键数据整理并以表格的形式呈现。',
    category: '数据',
    createdAt: 0,
    updatedAt: 0,
    isBuiltIn: true,
  },
  {
    id: 'default_screenshot',
    name: '📸 屏幕截图',
    prompt: '对当前页面截图，并简要分析页面上的布局和内容。',
    category: '通用',
    createdAt: 0,
    updatedAt: 0,
    isBuiltIn: true,
  },
  {
    id: 'default_translate',
    name: '🌐 翻译页面',
    prompt: '将当前页面的主要内容翻译成{{targetLanguage}}，保留原文格式和排版。',
    category: '翻译',
    createdAt: 0,
    updatedAt: 0,
    isBuiltIn: true,
  },
  {
    id: 'default_code_review',
    name: '🔍 代码分析',
    prompt: '分析以下代码，指出潜在问题、性能瓶颈和改进建议：\n\n```\n{{code}}\n```',
    category: '编程',
    createdAt: 0,
    updatedAt: 0,
    isBuiltIn: true,
  },
  {
    id: 'default_extract_data',
    name: '📋 提取数据',
    prompt: '从当前页面提取所有{{dataType}}信息，以 JSON 格式输出。',
    category: '数据',
    createdAt: 0,
    updatedAt: 0,
    isBuiltIn: true,
  },
  {
    id: 'default_improve_writing',
    name: '✍️ 改进写作',
    prompt: '请改进以下文本的语法、风格和清晰度，使其更加专业和易读：\n\n{{text}}',
    category: '写作',
    createdAt: 0,
    updatedAt: 0,
    isBuiltIn: true,
  },
  {
    id: 'default_summarize_text',
    name: '📄 文本总结',
    prompt: '请用{{length}}字以内总结以下内容的核心要点：\n\n{{text}}',
    category: '写作',
    createdAt: 0,
    updatedAt: 0,
    isBuiltIn: true,
  },
];

/**
 * Extract variable names from a prompt template string.
 * e.g. "Translate to {{targetLanguage}}" yields ["targetLanguage"]
 */
export function extractVariables(prompt: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(prompt)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  return variables;
}

/**
 * Replace variables in a prompt template with provided values.
 * Unmatched variables are left as-is.
 */
export function fillTemplate(prompt: string, values: Record<string, string>): string {
  return prompt.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    return values[name] !== undefined ? values[name] : `{{${name}}}`;
  });
}
