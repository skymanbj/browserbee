import { faTrash, faBrain, faCopy, faDownload, faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState } from 'react';
import { Message } from '../types';
import { Session } from '../../types/session';

interface OutputHeaderProps {
  onClearHistory: () => void;
  onReflectAndLearn: () => void;
  isProcessing: boolean;
  messages: Message[];
  sessions: Session[];
  activeSessionId: string | null;
  onSwitchSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
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
  onRenameSession
}) => {
  const [copied, setCopied] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleText, setEditingTitleText] = useState('');

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

  return (
    <div className="flex flex-col bg-base-300 border-b border-base-content border-opacity-10">
      <div className="flex justify-between items-center p-3">
        <div className="flex items-center gap-1.5 max-w-[65%] min-w-0">
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
              className="input input-xs input-bordered w-full max-w-[140px] font-semibold"
              autoFocus
            />
          ) : (
            <select
              value={activeSessionId || ''}
              onChange={(e) => onSwitchSession(e.target.value)}
              className="select select-xs select-bordered font-semibold text-xs max-w-[130px] truncate"
              disabled={isProcessing}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          )}
          
          <div className="flex gap-0.5 flex-shrink-0">
            {/* 新建会话 */}
            <button
              onClick={onNewSession}
              disabled={isProcessing}
              className="btn btn-ghost btn-xs btn-circle hover:bg-base-200"
              title="新建会话"
            >
              ➕
            </button>

            {/* 编辑标题 */}
            {!isEditingTitle && activeSessionId && (
              <button
                onClick={handleStartEditTitle}
                disabled={isProcessing}
                className="btn btn-ghost btn-xs btn-circle hover:bg-base-200"
                title="重命名会话"
              >
                ✏️
              </button>
            )}

            {/* 删除会话 */}
            {activeSessionId && sessions.length > 1 && (
              <button
                onClick={handleDeleteClick}
                disabled={isProcessing}
                className="btn btn-ghost btn-xs btn-circle text-error hover:bg-base-200"
                title="删除此会话"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Brain / Reflect */}
          <div className="tooltip tooltip-bottom" data-tip="Reflect and learn from this session">
            <button 
              onClick={onReflectAndLearn}
              className="btn btn-sm btn-outline btn-primary"
              disabled={isProcessing}
            >
              <FontAwesomeIcon icon={faBrain} />
            </button>
          </div>

          {/* Copy Button */}
          <div className="tooltip tooltip-bottom" data-tip="Copy entire conversation">
            <button 
              onClick={handleCopy}
              className={`btn btn-sm ${copied ? 'btn-success text-white' : 'btn-outline'}`}
              disabled={isProcessing || !hasMessages}
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
            </button>
          </div>

          {/* Export Button */}
          <div className="tooltip tooltip-bottom" data-tip="Export conversation">
            <button 
              onClick={() => setShowExport(!showExport)}
              className={`btn btn-sm ${showExport ? 'btn-active btn-primary' : 'btn-outline'}`}
              disabled={isProcessing || !hasMessages}
            >
              <FontAwesomeIcon icon={faDownload} />
            </button>
          </div>

          {/* Clear Button */}
          <div className="tooltip tooltip-bottom" data-tip="Clear conversation history and LLM context">
            <button 
              onClick={onClearHistory}
              className="btn btn-sm btn-outline btn-error"
              disabled={isProcessing}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Export Options */}
      {showExport && hasMessages && (
        <div className="flex items-center justify-around bg-base-200 px-3 py-2 border-t border-base-content border-opacity-10 text-xs">
          <span className="text-gray-500 font-medium mr-1">格式:</span>
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
