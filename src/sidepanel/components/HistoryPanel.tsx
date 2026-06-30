import { faSearch, faTrash, faArrowLeft, faClock, faComments, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState, useEffect, useCallback } from 'react';
import { ConversationSummary, SavedConversation, Message } from '../types';

interface HistoryPanelProps {
  visible: boolean;
  onClose: () => void;
  onRestore: (messages: Message[]) => void;
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ visible, onClose, onRestore }) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // 加载会话列表
  const loadConversations = useCallback(() => {
    setLoading(true);
    chrome.runtime.sendMessage(
      { action: 'getConversations' },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error loading conversations:', chrome.runtime.lastError);
          setLoading(false);
          return;
        }
        if (response?.success && response.conversations) {
          setConversations(response.conversations);
        }
        setLoading(false);
      }
    );
  }, []);

  // 打开面板时加载
  useEffect(() => {
    if (visible) {
      loadConversations();
      setSearchKeyword('');
      setConfirmClearAll(false);
    }
  }, [visible, loadConversations]);

  // 搜索
  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    if (!keyword.trim()) {
      loadConversations();
      return;
    }
    setLoading(true);
    chrome.runtime.sendMessage(
      { action: 'searchConversations', keyword },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error searching:', chrome.runtime.lastError);
          setLoading(false);
          return;
        }
        if (response?.success && response.conversations) {
          setConversations(response.conversations);
        }
        setLoading(false);
      }
    );
  }, [loadConversations]);

  // 恢复会话
  const handleRestore = useCallback((id: string) => {
    chrome.runtime.sendMessage(
      { action: 'getConversation', conversationId: id },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting conversation:', chrome.runtime.lastError);
          return;
        }
        if (response?.success && response.conversation) {
          const conv = response.conversation as SavedConversation;
          // 将 savedMessage 转为 Message
          const messages: Message[] = conv.messages.map(m => ({
            type: m.type as Message['type'],
            content: m.content,
            isComplete: true,
            imageData: (m as any).imageData,
            mediaType: (m as any).mediaType,
          }));
          onRestore(messages);
          onClose();
        }
      }
    );
  }, [onRestore, onClose]);

  // 删除单条
  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    chrome.runtime.sendMessage(
      { action: 'deleteConversation', conversationId: id },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error deleting:', chrome.runtime.lastError);
          return;
        }
        if (response?.success) {
          setConversations(prev => prev.filter(c => c.id !== id));
        }
      }
    );
  }, []);

  // 清空全部
  const handleClearAll = useCallback(() => {
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      return;
    }
    chrome.runtime.sendMessage(
      { action: 'clearAllConversations' },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error clearing all:', chrome.runtime.lastError);
          return;
        }
        if (response?.success) {
          setConversations([]);
          setConfirmClearAll(false);
        }
      }
    );
  }, [confirmClearAll]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100,
      background: '#edeff4',
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideInRight 0.25s ease-out',
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.5; }
          to { transform: translateX(0); opacity: 1; }
        }
        .history-card {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .history-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important;
          border-color: rgba(245,166,35,0.4) !important;
        }
        .history-delete-btn {
          opacity: 0;
          transition: opacity 0.15s;
        }
        .history-card:hover .history-delete-btn {
          opacity: 1;
        }
      `}</style>

      {/* 头部 */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fc 100%)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onClose}
              title="返回对话"
              style={{
                width: '28px', height: '28px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.05)',
                border: '1px solid rgba(0,0,0,0.1)',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
            >
              <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '11px' }} />
            </button>
            <span style={{
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              color: '#f5a623',
            }}>
              <FontAwesomeIcon icon={faClock} style={{ marginRight: '5px', fontSize: '12px' }} />
              历史会话
            </span>
          </div>

          {conversations.length > 0 && (
            <button
              onClick={handleClearAll}
              title={confirmClearAll ? '再次点击确认清空' : '清空全部历史'}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                background: confirmClearAll ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.07)',
                border: `1px solid ${confirmClearAll ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.18)'}`,
                color: '#dc2626',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = confirmClearAll ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.07)'; }}
            >
              <FontAwesomeIcon icon={faTrashAlt} style={{ marginRight: '4px', fontSize: '10px' }} />
              {confirmClearAll ? '确认清空?' : '清空全部'}
            </button>
          )}
        </div>

        {/* 搜索框 */}
        <div style={{ position: 'relative' }}>
          <FontAwesomeIcon
            icon={faSearch}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '11px',
              color: '#94a3b8',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={searchKeyword}
            onChange={e => handleSearch(e.target.value)}
            placeholder="搜索历史会话..."
            style={{
              width: '100%',
              padding: '7px 12px 7px 30px',
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.1)',
              background: 'rgba(0,0,0,0.03)',
              fontSize: '12px',
              color: '#334155',
              outline: 'none',
              transition: 'all 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'rgba(245,166,35,0.5)';
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(245,166,35,0.12)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* 列表 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 12px',
      }}>
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#94a3b8',
            fontSize: '13px',
          }}>
            加载中...
          </div>
        ) : conversations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '50px 20px',
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.5 }}>📭</div>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
              {searchKeyword ? '未找到匹配的会话' : '暂无历史会话'}
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '6px' }}>
              {searchKeyword ? '尝试其他关键词' : '发送对话后会自动保存'}
            </div>
          </div>
        ) : (
          conversations.map((conv, idx) => (
            <div
              key={conv.id}
              className="history-card"
              onClick={() => handleRestore(conv.id)}
              style={{
                padding: '10px 12px',
                marginBottom: '6px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                position: 'relative',
                animation: `fade-in-up 0.2s ease ${idx * 0.03}s both`,
              }}
            >
              {/* 标题行 */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '4px',
              }}>
                <div style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#1e293b',
                  lineHeight: 1.4,
                  flex: 1,
                  marginRight: '8px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {conv.title}
                </div>
                <button
                  className="history-delete-btn"
                  onClick={(e) => handleDelete(conv.id, e)}
                  title="删除此会话"
                  style={{
                    width: '22px', height: '22px',
                    borderRadius: '5px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                >
                  <FontAwesomeIcon icon={faTrash} style={{ fontSize: '9px' }} />
                </button>
              </div>

              {/* 预览 */}
              <div style={{
                fontSize: '11px',
                color: '#64748b',
                lineHeight: 1.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                marginBottom: '6px',
              }}>
                {conv.preview}
              </div>

              {/* 底部信息 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '10px',
                color: '#94a3b8',
              }}>
                <span>
                  <FontAwesomeIcon icon={faClock} style={{ marginRight: '3px', fontSize: '9px' }} />
                  {formatRelativeTime(conv.updatedAt)}
                </span>
                <span>
                  <FontAwesomeIcon icon={faComments} style={{ marginRight: '3px', fontSize: '9px' }} />
                  {conv.messageCount} 条消息
                </span>
                {conv.provider && (
                  <span style={{
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: 'rgba(124,58,237,0.08)',
                    color: '#7c3aed',
                    fontSize: '9px',
                    fontWeight: 600,
                  }}>
                    {conv.provider.startsWith('openai-compatible:') ? 'OpenAI兼容' : conv.provider}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
