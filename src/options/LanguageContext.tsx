import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translationDict: Record<string, Record<Language, string>> = {
  // Sidebar & tabs
  'General': { zh: '通用设置', en: 'General' },
  'LLM Configuration': { zh: '大模型配置', en: 'LLM Configuration' },
  'Memory': { zh: '记忆管理', en: 'Memory' },
  'Sessions': { zh: '会话管理', en: 'Sessions' },
  'Scheduled Tasks': { zh: '定时任务', en: 'Scheduled Tasks' },
  'Prompt Templates': { zh: '提示词模板', en: 'Prompt Templates' },

  // General Tab
  '🚀 Getting Started': { zh: '🚀 开始使用', en: '🚀 Getting Started' },
  'Follow these simple steps to start using BrowserBee:': {
    zh: '按照以下简单步骤开始使用 BrowserBee：',
    en: 'Follow these simple steps to start using BrowserBee:'
  },
  '1. Get an API Key': { zh: '1. 获取 API 密钥', en: '1. Get an API Key' },
  'Obtain an API key from one of these LLM providers:': {
    zh: '从以下大模型提供商获取 API 密钥：',
    en: 'Obtain an API key from one of these LLM providers:'
  },
  'Anthropic - Recommended for best performance': {
    zh: 'Anthropic - 推荐（性能最佳）',
    en: 'Anthropic - Recommended for best performance'
  },
  'OpenAI - Popular and reliable': {
    zh: 'OpenAI - 流行且可靠',
    en: 'OpenAI - Popular and reliable'
  },
  'Google Gemini - Good value for money': {
    zh: 'Google Gemini - 性价比高',
    en: 'Google Gemini - Good value for money'
  },
  'Ollama - Free local models': {
    zh: 'Ollama - 免费本地模型',
    en: 'Ollama - Free local models'
  },
  '2. Configure BrowserBee': { zh: '2. 配置 BrowserBee', en: '2. Configure BrowserBee' },
  'Go to the LLM Configuration tab and:': {
    zh: '前往“大模型配置”标签页并：',
    en: 'Go to the LLM Configuration tab and:'
  },
  'Select your preferred provider': {
    zh: '选择您首选的提供商',
    en: 'Select your preferred provider'
  },
  'Enter your API key': {
    zh: '输入您的 API 密钥',
    en: 'Enter your API key'
  },
  'Click Save Settings': {
    zh: '点击“保存设置”',
    en: 'Click Save Settings'
  },
  '3. Run Your First Task': { zh: '3. 运行您的第一个任务', en: '3. Run Your First Task' },
  'Try this example to get started:': {
    zh: '尝试此示例以开始：',
    en: 'Try this example to get started:'
  },
  'Open a new tab and go to google.com': {
    zh: '打开一个新标签页并前往 google.com',
    en: 'Open a new tab and go to google.com'
  },
  'Click the BrowserBee icon or press Alt+Shift+B': {
    zh: '点击 BrowserBee 图标或按 Alt+Shift+B',
    en: 'Click the BrowserBee icon or press Alt+Shift+B'
  },
  'Search for the weather in Paris': {
    zh: '搜索巴黎的天气',
    en: 'Search for the weather in Paris'
  },
  'Press Enter and watch BrowserBee work! 🐝': {
    zh: '按回车键，观看 BrowserBee 开始工作！ 🐝',
    en: 'Press Enter and watch BrowserBee work! 🐝'
  },
  '💡 Pro Tips': { zh: '💡 实用技巧', en: '💡 Pro Tips' },
  'Keep BrowserBee attached:': {
    zh: '保持 BrowserBee 连接：',
    en: 'Keep BrowserBee attached:'
  },
  'Leave it connected to a tab throughout your session for best performance': {
    zh: '在整个会话中保持连接到标签页以获得最佳性能',
    en: 'Leave it connected to a tab throughout your session for best performance'
  },
  'Reattach if needed:': {
    zh: '需要时重新连接：',
    en: 'Reattach if needed:'
  },
  'If you close the attached tab, use the reattach button to reconnect': {
    zh: '如果您关闭了连接的标签页，请使用“重新连接”按钮重新连接',
    en: 'If you close the attached tab, use the reattach button to reconnect'
  },
  'One per window:': {
    zh: '每个窗口一个实例：',
    en: 'One per window:'
  },
  'You can run one BrowserBee instance per Chrome window': {
    zh: '您可以在每个 Chrome 窗口中运行一个 BrowserBee 实例',
    en: 'You can run one BrowserBee instance per Chrome window'
  },
  'Tab limitations:': {
    zh: '标签页限制：',
    en: 'Tab limitations:'
  },
  "BrowserBee can't attach to new tabs or chrome:// pages": {
    zh: 'BrowserBee 无法连接到新标签页或 chrome:// 开头的页面',
    en: "BrowserBee can't attach to new tabs or chrome:// pages"
  },
  'Need Help?': { zh: '需要帮助？', en: 'Need Help?' },
  'Join Discord Community': { zh: '加入 Discord 社区', en: 'Join Discord Community' },
  'Get help, share tips, and connect with other BrowserBee users': {
    zh: '获取帮助、分享技巧，并与其他 BrowserBee 用户建立联系',
    en: 'Get help, share tips, and connect with other BrowserBee users'
  },

  // LLM Configuration
  'LLM Provider Configuration': { zh: '大语言模型提供商配置', en: 'LLM Provider Configuration' },
  'Configure your preferred LLM provider and API settings. Your API keys are stored securely in your browser\'s storage.': {
    zh: '配置您首选的大语言模型提供商和 API 设置。您的 API 密钥安全地存储在浏览器的本地存储中。',
    en: 'Configure your preferred LLM provider and API settings. Your API keys are stored securely in your browser\'s storage.'
  },
  'Select Provider': { zh: '选择模型提供商', en: 'Select Provider' },
  'API Key': { zh: 'API 密钥', en: 'API Key' },
  'Base URL (Optional)': { zh: '自定义接口地址 (选填)', en: 'Base URL (Optional)' },
  'API Model ID': { zh: 'API 模型 ID', en: 'API Model ID' },
  'Backup & Restore': { zh: '备份与恢复', en: 'Backup & Restore' },
  'Export Models & Config': { zh: '导出模型与配置', en: 'Export Models & Config' },
  'Import Models & Config': { zh: '导入模型与配置', en: 'Import Models & Config' },
  'Import from Page Assist': { zh: '从 Page Assist 导入', en: 'Import from Page Assist' },
  'Model Price List': { zh: '模型价格列表', en: 'Model Price List' },
  'OpenAI Compatible Instances': { zh: 'OpenAI 兼容实例', en: 'OpenAI Compatible Instances' },
  'Close ✕': { zh: '关闭 ✕', en: 'Close ✕' },
  'Settings saved successfully!': { zh: '设置保存成功！', en: 'Settings saved successfully!' },
  'Saving...': { zh: '保存中...', en: 'Saving...' },

  // Memory Tab
  'Memory Management': { zh: '记忆管理', en: 'Memory Management' },
  'BrowserBee stores memories of successful interactions with websites to improve future performance. View, edit, delete, or export your memories below.': {
    zh: 'BrowserBee 存储与网站成功交互的记忆，以提高未来的任务执行效率。您可以在下方查看、编辑、删除或导出记忆。',
    en: 'BrowserBee stores memories of successful interactions with websites to improve future performance. View, edit, delete, or export your memories below.'
  },
  'Total Memories': { zh: '记忆总数', en: 'Total Memories' },
  'Domains': { zh: '关联域名', en: 'Domains' },
  'Selected': { zh: '已选中', en: 'Selected' },
  'Search by domain or task...': { zh: '搜索域名或任务...', en: 'Search by domain or task...' },
  'All': { zh: '全部', en: 'All' },
  'Pre-built': { zh: '预置记忆', en: 'Pre-built' },
  'User': { zh: '用户自建', en: 'User' },
  'Select all': { zh: '全选', en: 'Select all' },
  'Delete Selected': { zh: '删除所选', en: 'Delete Selected' },
  'Clear All': { zh: '清空全部', en: 'Clear All' },
  'Export': { zh: '导出', en: 'Export' },
  'Import': { zh: '导入', en: 'Import' },
  'Refresh': { zh: '刷新', en: 'Refresh' },
  'No memories yet': { zh: '暂无记忆数据', en: 'No memories yet' },
  'Memories will be created automatically when BrowserBee completes tasks on websites. You can also import memories from a JSON backup.': {
    zh: 'BrowserBee 在网站上完成任务时会自动创建记忆。您也可以从 JSON 备份中导入记忆。',
    en: 'Memories will be created automatically when BrowserBee completes tasks on websites. You can also import memories from a JSON backup.'
  },
  'No matching memories': { zh: '未找到匹配的记忆数据', en: 'No matching memories' },
  'Try a different search term or filter selection.': {
    zh: '请尝试不同的搜索词或筛选条件。',
    en: 'Try a different search term or filter selection.'
  },
  'Unknown': { zh: '未知', en: 'Unknown' },
  'Invalid date': { zh: '无效日期', en: 'Invalid date' },
  'Dismiss': { zh: '关闭', en: 'Dismiss' },
  'Clear All Memories': { zh: '清空全部记忆', en: 'Clear All Memories' },
  'This will permanently remove all stored memories.': {
    zh: '这将永久删除所有已存储的记忆。',
    en: 'This will permanently remove all stored memories.'
  },
  'Delete Memories': { zh: '删除所选记忆', en: 'Delete Memories' },
  'Delete Memory': { zh: '删除单个记忆', en: 'Delete Memory' },
  'This will permanently remove all stored memories across all domains.': {
    zh: '这将永久删除所有域名下的全部记忆数据。',
    en: 'This will permanently remove all stored memories across all domains.'
  },
  'Cancel': { zh: '取消', en: 'Cancel' },
  'Save': { zh: '保存', en: 'Save' },
  'Edit Memory': { zh: '编辑记忆', en: 'Edit Memory' },
  'Domain': { zh: '所属域名', en: 'Domain' },
  'Domain cannot be changed here.': {
    zh: '此处无法修改所属域名。',
    en: 'Domain cannot be changed here.'
  },
  'Task Description': { zh: '任务描述', en: 'Task Description' },
  'Tool Sequence': { zh: '工具操作步骤序列', en: 'Tool Sequence' },
  'One step per line': { zh: '每行一个步骤', en: 'One step per line' },
  'Task description is required.': {
    zh: '任务描述不能为空。',
    en: 'Task description is required.'
  },
  'At least one tool step is required.': {
    zh: '至少需要包含一个步骤。',
    en: 'At least one tool step is required.'
  },
  'Memories to be deleted': { zh: '待删除的记忆数据', en: 'Memories to be deleted' },
  '...and {count} more': { zh: '...以及另外 {count} 项', en: '...and {count} more' },
  'This action cannot be undone.': {
    zh: '此操作无法撤销。',
    en: 'This action cannot be undone.'
  },
  'Tool Sequence:': { zh: '工具操作步骤:', en: 'Tool Sequence:' },
  'No steps recorded': { zh: '未记录任何步骤', en: 'No steps recorded' },
  'Page': { zh: '第', en: 'Page' },

  // Sessions Tab
  'Session Management': { zh: '会话管理', en: 'Session Management' },
  'BrowserBee records your chat histories and task execution sessions. Managing them helps clear space and organize past runs.': {
    zh: 'BrowserBee 记录您的聊天历史和任务执行会话。管理这些数据有助于清理空间并整理过去的任务。',
    en: 'BrowserBee records your chat histories and task execution sessions. Managing them helps clear space and organize past runs.'
  },
  'Total Sessions': { zh: '会话总数', en: 'Total Sessions' },
  'Total Messages': { zh: '消息总数', en: 'Total Messages' },
  'Total Tokens': { zh: '累计 Token', en: 'Total Tokens' },
  'Search by session name or tab...': { zh: '搜索会话名称或标签页...', en: 'Search by session name or tab...' },
  'No sessions yet': { zh: '暂无会话记录', en: 'No sessions yet' },
  'Sessions are created automatically when you interact with BrowserBee. You can view or delete them here.': {
    zh: '当您与 BrowserBee 交互时会自动创建会话。您可以在此处查看或删除它们。',
    en: 'Sessions are created automatically when you interact with BrowserBee. You can view or delete them here.'
  },

  // Scheduled Tasks Tab
  'Scheduled Task Management': { zh: '定时任务管理', en: 'Scheduled Task Management' },
  'Create and manage tasks that run periodically. BrowserBee can automate routines in the background on schedules you set.': {
    zh: '创建并管理定期运行的任务。BrowserBee 可以在您设定的日程安排下自动在后台运行日常任务。',
    en: 'Create and manage tasks that run periodically. BrowserBee can automate routines in the background on schedules you set.'
  },
  'Create New Task': { zh: '新建任务', en: 'Create New Task' },
  'Export Tasks': { zh: '导出任务', en: 'Export Tasks' },
  'Import Tasks': { zh: '导入任务', en: 'Import Tasks' },
  'No scheduled tasks yet': { zh: '暂无定时任务', en: 'No scheduled tasks yet' },
  'Create a task to automate actions on websites periodically.': {
    zh: '创建一个任务以定期在网站上执行自动化操作。',
    en: 'Create a task to automate actions on websites periodically.'
  },

  // Prompt Templates Tab
  'Prompt Template Management': { zh: '提示词模板管理', en: 'Prompt Template Management' },
  'Manage reusable templates for prompts. BrowserBee allows saving structures you use frequently to launch tasks quickly.': {
    zh: '管理可重用的提示词模板。BrowserBee 允许保存您常用的结构，以便快速启动任务。',
    en: 'Manage reusable templates for prompts. BrowserBee allows saving structures you use frequently to launch tasks quickly.'
  },
  'Create New Template': { zh: '新建模板', en: 'Create New Template' },
  'Export Templates': { zh: '导出模板', en: 'Export Templates' },
  'Import Templates': { zh: '导入模板', en: 'Import Templates' },
  'No templates yet': { zh: '暂无模板', en: 'No templates yet' },
  'Create templates to reuse prompt structures and values.': {
    zh: '创建模板以重复使用提示词结构和参数值。',
    en: 'Create templates to reuse prompt structures and values.'
  },
  // Cloud Sync
  'Cloud Sync': { zh: '云端同步', en: 'Cloud Sync' },
  'Cloud Sync Management': { zh: '云端数据同步', en: 'Cloud Sync Management' },
  'Configure cloud providers (Google Drive or WebDAV) to backup, restore, or merge all your extension data.': {
    zh: '配置云端服务（Google Drive 或 WebDAV）以备份、恢复或合并您的全部插件数据。',
    en: 'Configure cloud providers (Google Drive or WebDAV) to backup, restore, or merge all your extension data.'
  },
  'Sync Provider': { zh: '选择同步服务', en: 'Sync Provider' },
  'Disabled': { zh: '已禁用', en: 'Disabled' },
  'WebDAV URL': { zh: 'WebDAV 路径', en: 'WebDAV URL' },
  'Username': { zh: '用户名', en: 'Username' },
  'Password': { zh: '密码', en: 'Password' },
  'Google Drive Client ID': { zh: 'Google Drive 客户端 ID', en: 'Google Drive Client ID' },
  'Google Drive Client Secret': { zh: 'Google Drive 客户端密钥', en: 'Google Drive Client Secret' },
  'Connect & Authorize': { zh: '授权并绑定', en: 'Connect & Authorize' },
  'Disconnect': { zh: '断开绑定', en: 'Disconnect' },
  'Linked to Google Drive': { zh: '已成功绑定 Google Drive', en: 'Linked to Google Drive' },
  'Connection OK!': { zh: '连接成功！', en: 'Connection OK!' },
  'Sync Operations': { zh: '同步操作', en: 'Sync Operations' },
  'Smart Merge Sync 🔄': { zh: '双向智能同步 🔄', en: 'Smart Merge Sync 🔄' },
  'Backup to Cloud 📤': { zh: '备份到云端 📤', en: 'Backup to Cloud 📤' },
  'Restore from Cloud 📥': { zh: '从云端恢复 📥', en: 'Restore from Cloud 📥' },
  'Merge Sync downloads cloud data, merges it intelligently with your local data, and uploads the merged state back.': {
    zh: '双向智能同步会下载云端数据，与本地进行智能去重合并，并再次上传最新状态。',
    en: 'Merge Sync downloads cloud data, merges it intelligently with your local data, and uploads the merged state back.'
  },
  'Backup overwrites the cloud data with your current local data.': {
    zh: '备份到云端会使用本地的最新数据完全覆盖云端的备份文件。',
    en: 'Backup overwrites the cloud data with your current local data.'
  },
  'Restore overwrites your local data with the cloud backup. All current local data will be replaced.': {
    zh: '从云端恢复会下载云端备份并彻底覆写本地的所有数据。现有本地数据将被覆盖。',
    en: 'Restore overwrites your local data with the cloud backup. All current local data will be replaced.'
  },
  'Sync Status': { zh: '同步状态', en: 'Sync Status' },
  'Last Synced': { zh: '上次同步时间', en: 'Last Synced' },
  'Never': { zh: '从未同步', en: 'Never' },
  'Data range to be synced': { zh: '同步涵盖的数据范围', en: 'Data range to be synced' },
  '🧠 Interaction Memories': { zh: '🧠 网页交互记忆', en: '🧠 Interaction Memories' },
  '📋 Prompt Templates': { zh: '📋 提示词模板', en: '📋 Prompt Templates' },
  '⏰ Scheduled Tasks': { zh: '⏰ 后台定时任务', en: '⏰ Scheduled Tasks' },
  '💬 Chat Sessions': { zh: '💬 侧边栏会话历史', en: '💬 Chat Sessions' },
  '⚙️ LLM & System Settings': { zh: '⚙️ 大模型与系统设置', en: '⚙️ LLM & System Settings' },
  // Newly added LLM configuration tools
  'Pull Models': { zh: '拉取模型', en: 'Pull Models' },
  'Auto-pull Models': { zh: '自动拉取已下载模型', en: 'Auto-pull Models' },
  'Auto-pulling...': { zh: '正在自动拉取模型...', en: 'Auto-pulling...' },
  'Failed to pull models': { zh: '拉取模型失败', en: 'Failed to pull models' },
  'Models pulled successfully!': { zh: '模型拉取成功！', en: 'Models pulled successfully!' },
  'Test Connection': { zh: '测试连接', en: 'Test Connection' },
  'Current Model': { zh: '默认使用的模型', en: 'Default Model' },
  'Select a model': { zh: '选择一个模型', en: 'Select a model' },
  '当前尚未自动拉取模型列表。请填写 Base URL 和 API Key 后，点击上方「自动拉取已下载模型/自动拉取模型列表」按钮一键获取模型。': {
    zh: '当前尚未自动拉取模型列表。请填写 Base URL 和 API Key 后，点击上方「自动拉取已下载模型/自动拉取模型列表」按钮一键获取模型。',
    en: 'Model list is currently empty. Please fill in Base URL & API Key, then click the "Auto-pull Models" button above to fetch.'
  },
  '搜索模型名称...': { zh: '搜索模型名称...', en: 'Search models...' },
  '对话框模型池配置': { zh: '对话框模型池配置', en: 'Sidebar Model Pool Config' },
  '已启用': { zh: '已启用', en: 'Enabled' },
  '个模型': { zh: '个模型', en: 'models' },
  '在下方勾选您想要在侧边栏对话框里显示的模型。未勾选的模型将被隐藏，以保持侧边栏清爽。': {
    zh: '在下方勾选您想要在侧边栏对话框里显示的模型。未勾选的模型将被隐藏，以保持侧边栏清爽。',
    en: 'Select models to display in the sidebar. Unchecked models will be hidden to keep the interface clean.'
  },
  '过滤池中模型...': { zh: '过滤池中模型...', en: 'Filter models in pool...' },
  '全选': { zh: '全选', en: 'Select All' },
  '清空': { zh: '清空', en: 'Clear' },
  '未找到匹配的模型': { zh: '未找到匹配的模型', en: 'No matching models' }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('zh');

  // Load language settings on mount
  useEffect(() => {
    chrome.storage.local.get({ optionsLanguage: 'zh' }, (result) => {
      if (result.optionsLanguage) {
        setLanguageState(result.optionsLanguage as Language);
      }
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    chrome.storage.local.set({ optionsLanguage: lang });
  };

  const t = (key: string): string => {
    const cleanKey = key.trim();
    if (translationDict[cleanKey] && translationDict[cleanKey][language]) {
      return translationDict[cleanKey][language];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
