import React, { useState, useEffect } from 'react';
import { ConfigManager } from '../background/configManager';
import { FileAttachment } from '../background/types';
import { TokenTrackingService } from '../tracking/tokenTrackingService';
import { ApprovalRequest } from './components/ApprovalRequest';
import { MessageDisplay } from './components/MessageDisplay';
import { OutputHeader } from './components/OutputHeader';
import { PromptForm } from './components/PromptForm';
import { ProviderSelector } from './components/ProviderSelector';
import { TabStatusBar } from './components/TabStatusBar';
import { TokenUsageDisplay } from './components/TokenUsageDisplay';
import { useChromeMessaging } from './hooks/useChromeMessaging';
import { useMessageManagement } from './hooks/useMessageManagement';
import { useTabManagement } from './hooks/useTabManagement';

export function SidePanel() {
  // State for tab status
  const [tabStatus, setTabStatus] = useState<'attached' | 'detached' | 'unknown' | 'running' | 'idle' | 'error'>('unknown');

  // State for approval requests
  const [approvalRequests, setApprovalRequests] = useState<Array<{
    requestId: string;
    toolName: string;
    toolInput: string;
    reason: string;
  }>>([]);

  // State to track if any LLM providers are configured
  const [hasConfiguredProviders, setHasConfiguredProviders] = useState<boolean>(false);

  // State for file attachments
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  // Check if any providers are configured when component mounts
  useEffect(() => {
    const checkProviders = async () => {
      const configManager = ConfigManager.getInstance();
      const providers = await configManager.getConfiguredProviders();
      setHasConfiguredProviders(providers.length > 0);
    };

    checkProviders();

    // Listen for provider configuration changes
    const handleMessage = (message: any) => {
      if (message.action === 'providerConfigChanged') {
        checkProviders();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // Use custom hooks to manage state and functionality
  const {
    messages,
    streamingSegments,
    isStreaming,
    isProcessing,
    setIsProcessing,
    outputRef,
    addMessage,
    addSystemMessage,
    updateStreamingChunk,
    finalizeStreamingSegment,
    startNewSegment,
    completeStreaming,
    clearMessages,
    deleteMessage,
    deleteMultipleMessages,
    currentSegmentId
  } = useMessageManagement();

  const {
    tabId,
    windowId,
    tabTitle,
    setTabTitle
  } = useTabManagement(isProcessing);

  // Heartbeat interval for checking agent status
  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      // Request agent status
      chrome.runtime.sendMessage({
        action: 'checkAgentStatus',
        tabId,
        windowId
      });
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [isProcessing, tabId, windowId]);

  // Handlers for approval requests
  const handleApprove = (requestId: string) => {
    // Send approval to the background script
    approveRequest(requestId);
    // Remove the request from the list
    setApprovalRequests(prev => prev.filter(req => req.requestId !== requestId));
    // Add a system message to indicate approval
    addSystemMessage(`✅ Approved action: ${requestId}`);
  };

  const handleReject = (requestId: string) => {
    // Send rejection to the background script
    rejectRequest(requestId);
    // Remove the request from the list
    setApprovalRequests(prev => prev.filter(req => req.requestId !== requestId));
    // Add a system message to indicate rejection
    addSystemMessage(`❌ Rejected action: ${requestId}`);
  };

  // Set up Chrome messaging with callbacks
  const {
    executePrompt,
    cancelExecution,
    clearHistory,
    approveRequest,
    rejectRequest
  } = useChromeMessaging({
    tabId,
    windowId,
    onUpdateOutput: (content) => {
      addMessage({ ...content, isComplete: true });
    },
    onUpdateStreamingChunk: (content) => {
      updateStreamingChunk(content.content);
    },
    onFinalizeStreamingSegment: (id, content) => {
      finalizeStreamingSegment(id, content);
    },
    onStartNewSegment: (id) => {
      startNewSegment(id);
    },
    onStreamingComplete: () => {
      completeStreaming();
    },
    onUpdateLlmOutput: (content) => {
      addMessage({ type: 'llm', content, isComplete: true });
    },
    onRateLimit: () => {
      addSystemMessage("⚠️ Rate limit reached. Retrying automatically...");
      // Ensure the UI stays in processing mode
      setIsProcessing(true);
      // Update the tab status to running
      setTabStatus('running');
    },
    onFallbackStarted: (message) => {
      addSystemMessage(message);
      // Ensure the UI stays in processing mode
      setIsProcessing(true);
      // Update the tab status to running
      setTabStatus('running');
    },
    onUpdateScreenshot: (content) => {
      addMessage({ ...content, isComplete: true });
    },
    onProcessingComplete: () => {
      setIsProcessing(false);
      completeStreaming();
      // Also update the tab status to idle to ensure the UI indicator changes
      setTabStatus('idle');
    },
    onRequestApproval: (request) => {
      // Add the request to the list
      setApprovalRequests(prev => [...prev, request]);
    },
    setTabTitle,
    // New event handlers for tab events
    onTabStatusChanged: (status, _tabId) => {
      // Update the tab status state
      setTabStatus(status);
    },
    onTargetChanged: (_tabId, _url) => {
      // We don't need to do anything here as TabStatusBar handles this
    },
    onActiveTabChanged: (oldTabId, newTabId, title, url) => {
      // Update the tab title when the agent switches tabs
      console.log(`SidePanel: Active tab changed from ${oldTabId} to ${newTabId}`);
      setTabTitle(title);

      // Add a system message to indicate the tab change
      addSystemMessage(`Switched to tab: ${title} (${url})`);
    },
    onPageDialog: (tabId, dialogInfo) => {
      // Add a system message about the dialog
      addSystemMessage(`📢 Dialog: ${dialogInfo.type} - ${dialogInfo.message}`);
    },
    onPageError: (tabId, error) => {
      // Add a system message about the error
      addSystemMessage(`❌ Page Error: ${error}`);
    },
    onAgentStatusUpdate: (status, lastHeartbeat) => {
      // Log agent status updates for debugging
      console.log(`Agent status update: ${status}, lastHeartbeat: ${lastHeartbeat}, diff: ${Date.now() - lastHeartbeat}ms`);

      // Update the tab status based on agent status
      if (status === 'running' || status === 'idle' || status === 'error') {
        setTabStatus(status);
      }

      // If agent is running, ensure UI is in processing mode
      if (status === 'running') {
        setIsProcessing(true);
      }

      // If agent is idle, ensure UI is not in processing mode
      if (status === 'idle') {
        setIsProcessing(false);
      }
    }
  });

  // Handle form submission
  const handleSubmit = async (prompt: string, submittedAttachments?: FileAttachment[]) => {
    setIsProcessing(true);
    setTabStatus('running');

    const currentAttachments = submittedAttachments || attachments;
    const attachmentNote = currentAttachments.length > 0
      ? ` (${currentAttachments.length} attachment${currentAttachments.length > 1 ? 's' : ''})`
      : '';
    addSystemMessage(`New prompt: "${prompt}"${attachmentNote}`, currentAttachments.length > 0 ? currentAttachments : undefined);

    try {
      await executePrompt(prompt, currentAttachments.length > 0 ? currentAttachments : undefined);
      // Clear attachments after successful submission
      setAttachments([]);
    } catch (error) {
      console.error('Error:', error);
      addSystemMessage('Error: ' + (error instanceof Error ? error.message : String(error)));
      setIsProcessing(false);
      setTabStatus('error');
    }
  };

  // Handle editing a prompt (re-run starting from this prompt)
  const handleEditTurn = async (promptIndex: number, newPrompt: string, turnAttachments?: FileAttachment[]) => {
    // Truncate history from promptIndex onwards
    const indexesToDelete = messages.map((_, idx) => idx).filter(idx => idx >= promptIndex);
    deleteMultipleMessages(indexesToDelete);

    setIsProcessing(true);
    setTabStatus('running');

    const currentAttachments = turnAttachments || [];
    const attachmentNote = currentAttachments.length > 0
      ? ` (${currentAttachments.length} attachment${currentAttachments.length > 1 ? 's' : ''})`
      : '';
    addSystemMessage(`New prompt: "${newPrompt}"${attachmentNote}`, currentAttachments.length > 0 ? currentAttachments : undefined);

    try {
      await executePrompt(newPrompt, currentAttachments.length > 0 ? currentAttachments : undefined);
    } catch (error) {
      console.error('Error:', error);
      addSystemMessage('Error: ' + (error instanceof Error ? error.message : String(error)));
      setIsProcessing(false);
      setTabStatus('error');
    }
  };

  // Handle cancellation - also reject any pending approval requests
  const handleCancel = () => {
    // If there are any pending approval requests, reject them all
    if (approvalRequests.length > 0) {
      // Add a system message to indicate that approvals were rejected due to cancellation
      addSystemMessage(`❌ Cancelled execution - all pending approval requests were automatically rejected`);

      // Reject each pending approval request
      approvalRequests.forEach(req => {
        rejectRequest(req.requestId);
      });

      // Clear the approval requests
      setApprovalRequests([]);
    }

    // Cancel the execution
    cancelExecution();

    // Update the tab status to idle
    setTabStatus('idle');
  };

  // Handle clearing history
  const handleClearHistory = () => {
    clearMessages();
    clearHistory();

    // Reset token tracking
    const tokenTracker = TokenTrackingService.getInstance();
    tokenTracker.reset();
  };

  // Handle reflect and learn
  const handleReflectAndLearn = () => {
    // Send message to background script to trigger reflection
    chrome.runtime.sendMessage({
      action: 'reflectAndLearn',
      tabId
    });

    // Add a system message to indicate reflection is happening
    addSystemMessage("🧠 Reflecting on this session to learn useful patterns...");
  };

  // Function to navigate to the options page
  const navigateToOptions = () => {
    try {
      if (chrome.runtime && typeof chrome.runtime.openOptionsPage === 'function') {
        chrome.runtime.openOptionsPage().catch(() => {
          // Fallback: open options page directly via URL
          const optionsUrl = chrome.runtime.getURL('options.html');
          chrome.tabs.create({ url: optionsUrl });
        });
      } else {
        // Fallback for contexts where openOptionsPage is not available
        const optionsUrl = chrome.runtime.getURL('options.html');
        chrome.tabs.create({ url: optionsUrl });
      }
    } catch (e) {
      // Last resort fallback
      const optionsUrl = chrome.runtime.getURL('options.html');
      chrome.tabs.create({ url: optionsUrl });
    }
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: '#edeff4' }}>
      {/* 顶部状态栏 - 不使用白色背景，与全局背景 #edeff4 一体化 */}
      <div style={{
        padding: '8px 12px 6px',
        background: '#edeff4',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        flexShrink: 0,
      }}>
        <TabStatusBar
          tabId={tabId}
          tabTitle={tabTitle}
          tabStatus={tabStatus}
        />
      </div>

      {hasConfiguredProviders ? (
        <div className="flex flex-col flex-1 overflow-hidden" style={{ padding: '8px 12px 10px' }}>
          {/* 输出区域 */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: '12px',
            border: '1px solid #cbd5e1', // 下面卡片区域赋予清晰的灰色外边框，与背景协调一体
            background: 'rgba(255,255,255,0.9)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            marginBottom: '8px',
          }}>
            <OutputHeader
              onClearHistory={handleClearHistory}
              onReflectAndLearn={handleReflectAndLearn}
              isProcessing={isProcessing}
              messages={messages}
            />
            <div
              ref={outputRef}
              style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}
            >
              <MessageDisplay
                messages={messages}
                streamingSegments={streamingSegments}
                isStreaming={isStreaming}
                onDeleteMessage={deleteMessage}
                onDeleteTurn={deleteMultipleMessages}
                onEditTurn={handleEditTurn}
                isProcessing={isProcessing}
              />
            </div>
          </div>

          {/* Token 使用量 */}
          <TokenUsageDisplay />

          {/* 审批请求 */}
          {approvalRequests.map(req => (
            <ApprovalRequest
              key={req.requestId}
              requestId={req.requestId}
              toolName={req.toolName}
              toolInput={req.toolInput}
              reason={req.reason}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}

          {/* 输入表单 */}
          <PromptForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isProcessing={isProcessing}
            tabStatus={tabStatus}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
          />
          <ProviderSelector isProcessing={isProcessing} />
        </div>
      ) : (
        <div className="flex flex-col flex-grow items-center justify-center" style={{ padding: '20px' }}>
          <div style={{
            textAlign: 'center',
            padding: '32px 24px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(245,166,35,0.25)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🐝</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px', color: '#1e293b' }}>
              尚未配置 LLM 提供商
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: 1.6 }}>
              使用 BrowserBee 前，<br/>请先配置一个 AI 提供商
            </p>
            <button
              onClick={navigateToOptions}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f5a623, #e8891a)',
                color: '#1a1625',
                fontWeight: 700,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(245,166,35,0.35)',
              }}
            >
              ⚙️ 配置提供商
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
