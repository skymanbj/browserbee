import { useEffect, useState } from 'react';
import { ConfigManager } from '../background/configManager';
import { useTheme } from '../context/ThemeContext';
import { TokenTrackingService } from '../tracking/tokenTrackingService';
import { FileAttachment } from '../background/types';
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
  const { themeMode, toggleTheme } = useTheme();

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

  // State for runtime permission errors reported by the background script
  const [permissionError, setPermissionError] = useState<string | null>(null);

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

  // Listen for permission-required messages from the background script
  useEffect(() => {
    const handlePermissionMessage = (message: any) => {
      if (message.action === 'permissionRequired' && typeof message.reason === 'string') {
        setPermissionError(message.reason);
      }
    };

    chrome.runtime.onMessage.addListener(handlePermissionMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handlePermissionMessage);
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
    currentSegmentId,
    saveMessagesToSession,
    truncateMessagesForEdit,
    sessions,
    activeSessionId,
    initSessions,
    createNewSession,
    switchSession,
    deleteSession,
    renameSession
  } = useMessageManagement();

  const {
    tabId,
    windowId,
    tabTitle,
    setTabTitle
  } = useTabManagement(isProcessing);

  // Initialize sessions when tabId and windowId are available
  useEffect(() => {
    if (tabId !== null && windowId !== null) {
      initSessions(tabId, windowId);
    }
  }, [tabId, windowId]);

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
      // Save messages to the current session
      saveMessagesToSession();
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
  const handleSubmit = async (prompt: string) => {
    setIsProcessing(true);
    // Update the tab status to running
    setTabStatus('running');

    // Add a system message to indicate a new prompt
    addSystemMessage(`New prompt: "${prompt}"`);

    try {
      await executePrompt(prompt);
    } catch (error) {
      console.error('Error:', error);
      addSystemMessage('Error: ' + (error instanceof Error ? error.message : String(error)));
      setIsProcessing(false);
      // Update the tab status to error
      setTabStatus('error');
    }
  };

  // Handle turn editing and resubmission
  const handleEditTurn = async (promptIndex: number, newPrompt: string, attachments?: FileAttachment[]) => {
    setIsProcessing(true);
    setTabStatus('running');

    try {
      // 1. Truncate UI messages and sync to background
      await truncateMessagesForEdit(promptIndex);

      // 2. Add the new user prompt system message
      addSystemMessage(`New prompt: "${newPrompt}"${attachments && attachments.length > 0 ? ` (${attachments.length} attachment${attachments.length > 1 ? 's' : ''})` : ''}`, attachments);

      // 3. Re-execute prompt
      await executePrompt(newPrompt, attachments);
    } catch (error) {
      console.error('Error during edit and resubmit:', error);
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
    <div className="flex flex-col h-screen p-4 bg-base-200">
      <header className="mb-2 flex items-center justify-between">
        <TabStatusBar
          tabId={tabId}
          tabTitle={tabTitle}
          tabStatus={tabStatus}
        />
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-sm rounded-full flex items-center gap-1.5 shrink-0"
          aria-label={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} theme`}
          title={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} theme`}
        >
          {themeMode === 'light' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          )}
        </button>
      </header>

      {permissionError && (
        <div className="alert alert-warning mb-2 shadow-sm">
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Permission required</span>
            <span>{permissionError}</span>
          </div>
          <button
            onClick={() => {
              setPermissionError(null);
              // Retry tab initialization if we have a current tab
              if (tabId !== null && windowId !== null) {
                chrome.runtime.sendMessage({
                  action: 'initializeTab',
                  tabId,
                  windowId
                });
              }
            }}
            className="btn btn-sm btn-primary whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      {hasConfiguredProviders ? (
        <>
          <div className="flex flex-col flex-grow gap-4 overflow-hidden md:flex-row shadow-sm">
            <div className="card bg-base-100 shadow-md flex-1 flex flex-col overflow-hidden">
              <OutputHeader
                onClearHistory={handleClearHistory}
                onReflectAndLearn={handleReflectAndLearn}
                isProcessing={isProcessing}
                messages={messages}
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSwitchSession={switchSession}
                onNewSession={createNewSession}
                onDeleteSession={deleteSession}
                onRenameSession={renameSession}
              />
              <div
                ref={outputRef}
                className="card-body p-3 overflow-auto bg-base-100 flex-1"
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
          </div>

          {/* Add Token Usage Display */}
          <TokenUsageDisplay />

          {/* Display approval requests */}
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

          <PromptForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isProcessing={isProcessing}
            tabStatus={tabStatus}
          />
          <ProviderSelector isProcessing={isProcessing} />
        </>
      ) : (
        <div className="flex flex-col flex-grow items-center justify-center">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-2">No LLM provider configured</h2>
            <p className="text-gray-600 mb-4">
              You need to configure an LLM provider before you can use BrowserBee.
            </p>
            <button
              onClick={navigateToOptions}
              className="btn btn-primary"
            >
              Configure Providers
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
