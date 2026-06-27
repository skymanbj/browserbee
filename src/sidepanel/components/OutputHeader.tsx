import { faTrash, faBrain, faCopy, faDownload, faCheck, faClock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState } from 'react';
import { Message } from '../types';

interface OutputHeaderProps {
  onClearHistory: () => void;
  onReflectAndLearn: () => void;
  onOpenHistory: () => void;
  isProcessing: boolean;
  messages: Message[];
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
  onOpenHistory,
  isProcessing,
  messages
}) => {
  const [copied, setCopied] = useState(false);
  const [showExport, setShowExport] = useState(false);

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
    <div style={{
      borderBottom: '1px solid rgba(0,0,0,0.08)',
      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fc 100%)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
        {/* 标题 */}
        <div style={{
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: '#f5a623',
        }}>
          对话输出
        </div>

        {/* 操作按钮组 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* 反思学习 */}
          <button
            onClick={onReflectAndLearn}
            disabled={isProcessing}
            title="反思并学习此次会话"
            style={{
              width: '28px', height: '28px',
              borderRadius: '8px',
              background: 'rgba(124,58,237,0.15)',
              border: '1px solid rgba(124,58,237,0.3)',
              color: '#a78bfa',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              opacity: isProcessing ? 0.4 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.15)'; e.currentTarget.style.transform = ''; }}
          >
            <FontAwesomeIcon icon={faBrain} style={{ fontSize: '11px' }} />
          </button>

          {/* 历史记录 */}
          <button
            onClick={onOpenHistory}
            disabled={isProcessing}
            title="历史会话"
            style={{
              width: '28px', height: '28px',
              borderRadius: '8px',
              background: 'rgba(245,166,35,0.1)',
              border: '1px solid rgba(245,166,35,0.25)',
              color: '#f5a623',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              opacity: isProcessing ? 0.4 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.1)'; e.currentTarget.style.transform = ''; }}
          >
            <FontAwesomeIcon icon={faClock} style={{ fontSize: '11px' }} />
          </button>

          {/* 复制 */}
          <button
            onClick={handleCopy}
            disabled={isProcessing || !hasMessages}
            title="复制全部对话"
            style={{
              width: '28px', height: '28px',
              borderRadius: '8px',
              background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(0,0,0,0.1)'}`,
              color: copied ? '#16a34a' : '#64748b',
              cursor: (!isProcessing && hasMessages) ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              opacity: (!isProcessing && hasMessages) ? 1 : 0.35,
            }}
            onMouseEnter={e => { if (!isProcessing && hasMessages) e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; }}
            onMouseLeave={e => { if (!isProcessing && hasMessages) e.currentTarget.style.background = copied ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.05)'; }}
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} style={{ fontSize: '11px' }} />
          </button>

          {/* 导出 */}
          <button
            onClick={() => setShowExport(!showExport)}
            disabled={isProcessing || !hasMessages}
            title="导出对话"
            style={{
              width: '28px', height: '28px',
              borderRadius: '8px',
              background: showExport ? 'rgba(245,166,35,0.12)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${showExport ? 'rgba(245,166,35,0.35)' : 'rgba(0,0,0,0.1)'}`,
              color: showExport ? '#d97706' : '#64748b',
              cursor: (!isProcessing && hasMessages) ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              opacity: (!isProcessing && hasMessages) ? 1 : 0.35,
            }}
            onMouseEnter={e => { if (!isProcessing && hasMessages) e.currentTarget.style.background = 'rgba(245,166,35,0.2)'; }}
            onMouseLeave={e => { if (!isProcessing && hasMessages) e.currentTarget.style.background = showExport ? 'rgba(245,166,35,0.12)' : 'rgba(0,0,0,0.05)'; }}
          >
            <FontAwesomeIcon icon={faDownload} style={{ fontSize: '11px' }} />
          </button>

          {/* 清除 */}
          <button
            onClick={onClearHistory}
            disabled={isProcessing}
            title="清除对话历史和LLM上下文"
            style={{
              width: '28px', height: '28px',
              borderRadius: '8px',
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.18)',
              color: '#dc2626',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              opacity: isProcessing ? 0.4 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.22)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.transform = ''; }}
          >
            <FontAwesomeIcon icon={faTrash} style={{ fontSize: '11px' }} />
          </button>
        </div>
      </div>

      {/* 导出格式展开区 */}
      {showExport && hasMessages && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 12px',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          background: '#f8f9fc',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '11px', color: '#64748b', marginRight: '2px' }}>导出为:</span>
          {(['md', 'pdf', 'txt', 'json'] as const).map(fmt => (
            <button
              key={fmt}
              onClick={() => handleExportClick(fmt)}
              style={{
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(245,166,35,0.1)',
                border: '1px solid rgba(245,166,35,0.25)',
                color: '#f5a623',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textTransform: 'uppercase',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,166,35,0.1)'; }}
            >
              {fmt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
