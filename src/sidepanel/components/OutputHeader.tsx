import React, { useEffect, useState } from 'react';
import { ChatSession } from '../../types/session';
import { Message } from '../types';

interface OutputHeaderProps {
  onClearHistory: () => void;
  onReflectAndLearn: () => void;
  isProcessing: boolean;
  messages: Message[];
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSwitchSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  /** 主题相关（可选）：收进溢出菜单 */
  themeMode?: 'dark' | 'light';
  onToggleTheme?: () => void;
  /** 设置 / 帮助入口（可选）：收进溢出菜单 */
  onOpenOptions?: () => void;
  onOpenHelp?: () => void;
}

const formatToMarkdown = (messages: Message[]): string => {
  return messages.map(m => {
    if (m.type === 'system') {
      const content = m.content;
      if (content.startsWith('New prompt: "') && content.endsWith('"')) {
        const prompt = content.substring('New prompt: "'.length, content.length - 1);
        return `### 👤 User\n\n${prompt}\n`;
      }
      return `* [System]: ${content} *\n`;
    } else if (m.type === 'llm') {
      return `### 🤖 Agent\n\n${m.content}\n`;
    } else if (m.type === 'screenshot') {
      return `* [Screenshot] *\n`;
    }
    return '';
  }).filter(Boolean).join('\n');
};

const formatToText = (messages: Message[]): string => {
  return messages.map(m => {
    if (m.type === 'system') {
      const content = m.content;
      if (content.startsWith('New prompt: "') && content.endsWith('"')) {
        const prompt = content.substring('New prompt: "'.length, content.length - 1);
        return `[User]: ${prompt}\n`;
      }
      return `[System]: ${content}\n`;
    } else if (m.type === 'llm') {
      return `[Agent]: ${m.content}\n`;
    } else if (m.type === 'screenshot') {
      return `[Screenshot]\n`;
    }
    return '';
  }).filter(Boolean).join('\n');
};

/** 统一的线性图标外壳：viewBox 24 / stroke currentColor / strokeWidth 2 */
const LineIcon: React.FC<{ size?: number; children: React.ReactNode }> = ({ size = 14, children }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

/** 溢出菜单用的图标集合（替换原来的 emoji） */
const MenuIcons = {
  rename: (
    <LineIcon>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </LineIcon>
  ),
  trash: (
    <LineIcon>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </LineIcon>
  ),
  reflect: (
    <LineIcon>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2z" />
    </LineIcon>
  ),
  copy: (
    <LineIcon>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </LineIcon>
  ),
  check: (
    <LineIcon>
      <path d="M20 6L9 17l-5-5" />
    </LineIcon>
  ),
  export: (
    <LineIcon>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </LineIcon>
  ),
  clear: (
    <LineIcon>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </LineIcon>
  ),
  sun: (
    <LineIcon>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.9 4.9l1.4 1.4" />
      <path d="M17.7 17.7l1.4 1.4" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.9 19.1l1.4-1.4" />
      <path d="M17.7 6.3l1.4-1.4" />
    </LineIcon>
  ),
  moon: (
    <LineIcon>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </LineIcon>
  ),
  settings: (
    <LineIcon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </LineIcon>
  ),
  help: (
    <LineIcon>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </LineIcon>
  ),
};

const exportToPDF = (messages: Message[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>BrowserBee Conversation History</title>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          padding: 40px;
          color: #333;
          line-height: 1.6;
        }
        .header {
          border-bottom: 2px solid #eaeaea;
          padding-bottom: 15px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          color: #4f46e5;
        }
        .header p {
          margin: 5px 0 0 0;
          font-size: 14px;
          color: #666;
        }
        .message {
          margin-bottom: 25px;
          padding: 15px;
          border-radius: 8px;
          background-color: #f9fafb;
          border: 1px solid #f3f4f6;
          page-break-inside: avoid;
        }
        .message-user {
          border-left: 4px solid #4f46e5;
          background-color: #f5f3ff;
        }
        .message-agent {
          border-left: 4px solid #10b981;
          background-color: #ecfdf5;
        }
        .message-system {
          border-left: 4px solid #9ca3af;
          background-color: #f9fafb;
          font-size: 13px;
          color: #4b5563;
        }
        .sender {
          font-weight: bold;
          margin-bottom: 8px;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sender-user { color: #4f46e5; }
        .sender-agent { color: #10b981; }
        .sender-system { color: #6b7280; }
        .content {
          white-space: pre-wrap;
          font-size: 14px;
        }
        .screenshot-img {
          max-width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          margin-top: 10px;
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>BrowserBee 🐝 对话历史记录</h1>
        <p>导出时间: ${new Date().toLocaleString()}</p>
      </div>
      <div class="messages">
        ${messages.map(m => {
    let sender = 'System';
    let cssClass = 'message-system';
    let senderClass = 'sender-system';
    let contentHtml = '';

    if (m.type === 'system') {
      const content = m.content;
      if (content.startsWith('New prompt: "') && content.endsWith('"')) {
        sender = 'User';
        cssClass = 'message-user';
        senderClass = 'sender-user';
        contentHtml = content.substring('New prompt: "'.length, content.length - 1);
      } else {
        sender = 'System Log';
        cssClass = 'message-system';
        senderClass = 'sender-system';
        contentHtml = content;
      }
    } else if (m.type === 'llm') {
      sender = 'Agent';
      cssClass = 'message-agent';
      senderClass = 'sender-agent';
      contentHtml = m.content;
    } else if (m.type === 'screenshot') {
      sender = 'Screenshot';
      cssClass = 'message-system';
      senderClass = 'sender-system';
      contentHtml = `<img class="screenshot-img" src="${m.imageData}" />`;
    }

    if (!contentHtml) return '';

    return `
            <div class="message ${cssClass}">
              <div class="sender ${senderClass}">${sender}</div>
              <div class="content">${contentHtml}</div>
            </div>
          `;
  }).filter(Boolean).join('')}
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

const exportToJSON = (messages: Message[]) => {
  const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `browserbee-chat-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportToMarkdown = (messages: Message[]) => {
  const content = formatToMarkdown(messages);
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `browserbee-chat-${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportToText = (messages: Message[]) => {
  const content = formatToText(messages);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `browserbee-chat-${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

export const OutputHeader: React.FC<OutputHeaderProps> = ({
  onClearHistory,
  onReflectAndLearn,
  isProcessing,
  messages,
  sessions,
  activeSessionId,
  onSwitchSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  themeMode,
  onToggleTheme,
  onOpenOptions,
  onOpenHelp
}) => {
  const [copied, setCopied] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleText, setEditingTitleText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleStartEditTitle = () => {
    if (!activeSessionId) return;
    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (currentSession) {
      setEditingTitleText(currentSession.title);
      setIsEditingTitle(true);
    }
  };

  const handleSaveTitle = () => {
    if (activeSessionId && editingTitleText.trim()) {
      onRenameSession(activeSessionId, editingTitleText.trim());
    }
    setIsEditingTitle(false);
  };

  const handleDeleteClick = () => {
    if (!activeSessionId) return;
    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (currentSession && confirm(`确定要删除会话“${currentSession.title}”吗？`)) {
      onDeleteSession(activeSessionId);
    }
  };

  const handleCopy = () => {
    if (messages.length === 0) return;
    const content = formatToText(messages);
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const handleExportClick = (format: 'md' | 'pdf' | 'txt' | 'json') => {
    if (messages.length === 0) return;

    if (format === 'pdf') {
      exportToPDF(messages);
    } else if (format === 'json') {
      exportToJSON(messages);
    } else if (format === 'md') {
      exportToMarkdown(messages);
    } else if (format === 'txt') {
      exportToText(messages);
    }

    setShowExport(false);
  };

  const hasMessages = messages.length > 0;

  // 点击空白处关闭溢出菜单
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const menuItem = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    opts?: { danger?: boolean; disabled?: boolean }
  ) => (
    <button
      type="button"
      disabled={opts?.disabled}
      onClick={(e) => {
        e.stopPropagation();
        setMenuOpen(false);
        onClick();
      }}
      className={`w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-base-200 disabled:opacity-40 disabled:cursor-not-allowed ${opts?.danger ? 'text-error' : 'text-base-content'}`}
    >
      <span className="w-4 flex items-center justify-center shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 shrink-0">
        {isEditingTitle ? (
          <input
            type="text"
            value={editingTitleText}
            onChange={(e) => setEditingTitleText(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') setIsEditingTitle(false);
            }}
            className="input input-xs input-bordered w-[150px] font-semibold"
            autoFocus
          />
        ) : (
          <select
            value={activeSessionId || ''}
            onChange={(e) => onSwitchSession(e.target.value)}
            className="select select-xs select-bordered font-semibold text-xs w-[150px] truncate"
            disabled={isProcessing}
            title={sessions.find((s) => s.id === activeSessionId)?.title || '切换会话'}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        )}

        {/* 新建会话 */}
        <button
          onClick={() => onNewSession()}
          disabled={isProcessing}
          className="btn btn-ghost btn-xs btn-circle h-5 w-5 min-h-0 p-0 shrink-0"
          title="新建会话"
        >
          ➕
        </button>

        {/* 溢出菜单：重命名 / 删除会话 / 反思 / 复制 / 导出 / 清空 / 主题 / 设置 / 帮助 */}
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className={`btn btn-ghost btn-xs btn-circle h-5 w-5 min-h-0 p-0 ${menuOpen ? 'bg-base-200' : ''}`}
            title="更多操作"
          >
            ⋯
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-md border border-base-content/10 bg-base-100 shadow-lg text-xs py-1">
              {activeSessionId &&
                menuItem(MenuIcons.rename, '重命名会话', handleStartEditTitle, { disabled: isProcessing })}
              {activeSessionId && sessions.length > 1 &&
                menuItem(MenuIcons.trash, '删除会话', handleDeleteClick, { disabled: isProcessing, danger: true })}
              {menuItem(MenuIcons.reflect, '反思学习', onReflectAndLearn, { disabled: isProcessing })}
              {menuItem(copied ? MenuIcons.check : MenuIcons.copy, copied ? '已复制' : '复制对话', handleCopy, { disabled: isProcessing || !hasMessages })}
              {menuItem(MenuIcons.export, '导出对话', () => setShowExport((v) => !v), { disabled: isProcessing || !hasMessages })}
              {menuItem(MenuIcons.clear, '清空历史', onClearHistory, { disabled: isProcessing, danger: true })}
              {(onToggleTheme || onOpenOptions || onOpenHelp) && (
                <div className="my-1 border-t border-base-content/10" />
              )}
              {onToggleTheme &&
                menuItem(themeMode === 'dark' ? MenuIcons.sun : MenuIcons.moon, themeMode === 'dark' ? '浅色主题' : '深色主题', onToggleTheme)}
              {onOpenOptions && menuItem(MenuIcons.settings, '设置', onOpenOptions)}
              {onOpenHelp && menuItem(MenuIcons.help, '帮助', onOpenHelp)}
            </div>
          )}
        </div>
      </div>

      {/* Expandable Export Options */}
      {showExport && hasMessages && (
        <div className="flex items-center justify-around bg-base-200 px-2 py-1 mt-1 rounded border border-base-content border-opacity-10 text-xs">
          <span className="text-base-content/60 font-medium mr-1">格式:</span>
          <button
            onClick={() => handleExportClick('md')}
            className="btn btn-xs btn-outline btn-primary"
          >
            Markdown (.md)
          </button>
          <button
            onClick={() => handleExportClick('pdf')}
            className="btn btn-xs btn-outline btn-primary"
          >
            PDF (.pdf)
          </button>
          <button
            onClick={() => handleExportClick('txt')}
            className="btn btn-xs btn-outline btn-primary"
          >
            TXT (.txt)
          </button>
          <button
            onClick={() => handleExportClick('json')}
            className="btn btn-xs btn-outline btn-primary"
          >
            JSON (.json)
          </button>
        </div>
      )}
    </div>
  );
};
