import { faSync } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState, useEffect } from 'react';

interface TabStatusBarProps {
  tabId: number | null;
  tabTitle: string;
  tabStatus: 'attached' | 'detached' | 'unknown' | 'running' | 'idle' | 'error';
}

export const TabStatusBar: React.FC<TabStatusBarProps> = ({
  tabId,
  tabTitle,
  tabStatus
}) => {
  const [tabUrl, setTabUrl] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Listen for URL changes only
  useEffect(() => {
    if (!tabId) return;
    
    const statusListener = (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      // Ignore messages from other extensions
      if (sender.id !== chrome.runtime.id) {
        return;
      }
      
      // Only process messages for our tab
      if (message.tabId !== tabId) {
        return;
      }
      
      // Update URL based on message type
      if (message.action === 'targetChanged' && message.url) {
        setTabUrl(message.url);
        sendResponse({ received: true });
      }
      
      return true;
    };
    
    // Add the message listener
    chrome.runtime.onMessage.addListener(statusListener);
    
    // Get initial tab URL
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting tab:', chrome.runtime.lastError);
        return;
      }
      
      if (tab && tab.url) {
        setTabUrl(tab.url);
      }
    });
    
    // Clean up the listener when the component unmounts
    return () => {
      chrome.runtime.onMessage.removeListener(statusListener);
    };
  }, [tabId]);
  
  if (!tabId) return null;

  const handleTabClick = () => {
    chrome.runtime.sendMessage({ action: 'switchToTab', tabId });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    chrome.runtime.sendMessage({
      action: 'updateOutput',
      content: { type: 'system', content: 'Refreshing connection to tab...' }
    });
    setTimeout(() => { window.location.reload(); }, 500);
  };

  const statusConfig: Record<string, { color: string; label: string; glow: string }> = {
    running: { color: '#60a5fa', label: '运行中', glow: 'rgba(96,165,250,0.4)' },
    idle: { color: '#4ade80', label: '就绪', glow: 'rgba(74,222,128,0.35)' },
    attached: { color: '#4ade80', label: '已连接', glow: 'rgba(74,222,128,0.35)' },
    detached: { color: '#f87171', label: '已断开', glow: 'rgba(248,113,113,0.4)' },
    error: { color: '#f87171', label: '错误', glow: 'rgba(248,113,113,0.4)' },
    unknown: { color: '#94a3b8', label: '未知', glow: 'rgba(148,163,184,0.3)' },
  };

  const sc = statusConfig[tabStatus] || statusConfig.unknown;


  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(255,255,255,0.6)',
      borderRadius: '20px',
      padding: '4px 8px 4px 6px',
      border: '1px solid rgba(0,0,0,0.1)',
      width: '100%',
    }}>
      {/* 状态点 */}
      <span style={{
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        background: sc.color,
        boxShadow: `0 0 6px ${sc.glow}`,
        flexShrink: 0,
        animation: (tabStatus === 'running' || tabStatus === 'attached') ? 'bee-pulse 2s infinite' : 'none',
      }} title={sc.label} />

      {/* Tab 标题 */}
      <span
        style={{
          fontSize: '11px',
          color: '#475569',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
        }}
        onClick={handleTabClick}
        title={`${tabTitle}${tabUrl ? `\n${tabUrl}` : ''}`}
      >
        {tabTitle || '无标签页'}
      </span>

      {/* 刷新按钮 */}
      <button
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.2s',
        }}
        onClick={handleRefresh}
        disabled={isRefreshing}
        title="重新连接标签页"
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,166,35,0.15)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
      >
        <FontAwesomeIcon
          icon={faSync}
          style={{ fontSize: '9px', color: '#94a3b8' }}
          className={isRefreshing ? 'animate-spin' : ''}
        />
      </button>
    </div>
  );
};
