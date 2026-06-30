import { handleApprovalResponse } from '../agent/approvalManager';
import { TokenTrackingService } from '../tracking/tokenTrackingService';
import { cancelExecution, clearMessageHistory, executePrompt, getAgentStatus, initializeAgent } from './agentController';
import { triggerReflection } from './reflectionController';
import { SessionService } from './sessionService';
import { attachToTab, forceResetPlaywright, getTabState, getWindowForTab } from './tabManager';
import { BackgroundMessage } from './types';
import { handleError, logWithTimestamp } from './utils';

/**
 * Handle messages from the UI
 * @param message The message to handle
 * @param sender The sender of the message
 * @param sendResponse The function to send a response
 * @returns True if the message was handled, false otherwise
 */
export function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean {
  try {
    // Type guard to check if the message is a valid background message
    if (!isBackgroundMessage(message)) {
      logWithTimestamp(`Ignoring unknown message type: ${JSON.stringify(message)}`, 'warn');
      sendResponse({ success: false, error: 'Unknown message type' });
      return false;
    }

    // Handle the message based on its action
    switch (message.action) {
      case 'executePrompt':
        handleExecutePrompt(message, sendResponse);
        return true; // Keep the message channel open for async response

      case 'cancelExecution':
        handleCancelExecution(message, sendResponse);
        return true;

      case 'clearHistory':
        // Handle async function and keep message channel open
        handleClearHistory(message, sendResponse)
          .catch((error: any) => {
            const errorMessage = handleError(error, 'clearing history');
            logWithTimestamp(`Error in async handleClearHistory: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true; // Keep the message channel open for async response

      case 'initializeTab':
        // This function uses setTimeout internally to handle async operations
        // We still return true to keep the message channel open
        handleInitializeTab(message, sendResponse);
        return true; // Keep the message channel open for async response
        
      case 'switchToTab':
        handleSwitchToTab(message, sendResponse);
        return true;
        
      case 'getTokenUsage':
        handleGetTokenUsage(message, sendResponse);
        return true;
        
      case 'approvalResponse':
        handleApprovalResponse(message.requestId, message.approved);
        sendResponse({ success: true });
        return true;
        
      case 'reflectAndLearn':
        handleReflectAndLearn(message, sendResponse);
        return true;
        
      case 'tokenUsageUpdated':
        // Just pass through token usage updates
        // This allows the TokenTrackingService to broadcast updates
        // that will be received by all UI components
        sendResponse({ success: true });
        return true;
        
      case 'updateOutput':
        // Just pass through output updates
        // This allows components to send UI updates
        sendResponse({ success: true });
        return true;
        
      case 'providerConfigChanged':
        // Just pass through provider configuration change notifications
        // This allows the ProviderSelector component to refresh
        sendResponse({ success: true });
        return true;
        
      case 'forceResetPlaywright':
        // Handle async function and keep message channel open
        handleForceResetPlaywright(message, sendResponse)
          .catch((error: any) => {
            const errorMessage = handleError(error, 'force resetting Playwright');
            logWithTimestamp(`Error in async handleForceResetPlaywright: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true; // Keep the message channel open for async response
        
      case 'requestApproval':
        // Just acknowledge receipt of the request approval message
        // The actual approval handling is done by the UI
        sendResponse({ success: true });
        return true;
        
      case 'checkAgentStatus':
        // Handle async function and keep message channel open
        handleCheckAgentStatus(message, sendResponse)
          .catch((error: any) => {
            const errorMessage = handleError(error, 'checking agent status');
            logWithTimestamp(`Error in async handleCheckAgentStatus: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true; // Keep the message channel open for async response

      case 'sessionCreate':
        handleSessionCreate(message, sendResponse)
          .catch((error: any) => {
            const errorMessage = handleError(error, 'creating session');
            logWithTimestamp(`Error in handleSessionCreate: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true;

      case 'sessionUpdate':
        handleSessionUpdate(message, sendResponse)
          .catch((error: any) => {
            const errorMessage = handleError(error, 'updating session');
            logWithTimestamp(`Error in handleSessionUpdate: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true;

      case 'sessionDelete':
        handleSessionDelete(message, sendResponse)
          .catch((error: any) => {
            const errorMessage = handleError(error, 'deleting session');
            logWithTimestamp(`Error in handleSessionDelete: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true;

      case 'sessionDeleteMany':
        handleSessionDeleteMany(message, sendResponse)
          .catch((error: any) => {
            const errorMessage = handleError(error, 'deleting multiple sessions');
            logWithTimestamp(`Error in handleSessionDeleteMany: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true;

      case 'sessionGetAll':
        handleSessionGetAll(message, sendResponse)
          .catch((error: any) => {
            const errorMessage = handleError(error, 'getting all sessions');
            logWithTimestamp(`Error in handleSessionGetAll: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true;

      case 'sessionGetById':
        handleSessionGetById(message, sendResponse)
          .catch((error: any) => {
            const errorMessage = handleError(error, 'getting session by id');
            logWithTimestamp(`Error in handleSessionGetById: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true;

      case 'sessionRename':
        handleSessionRename(message, sendResponse)
          .catch((error: any) => {
            const errorMessage = handleError(error, 'renaming session');
            logWithTimestamp(`Error in handleSessionRename: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true;

      case 'sessionSearch':
        handleSessionSearch(message, sendResponse)
          .catch((error: any) => {
            const errorMessage = handleError(error, 'searching sessions');
            logWithTimestamp(`Error in handleSessionSearch: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true;

      case 'sessionExport':
        handleSessionExport(message, sendResponse)
          .catch((error: any) => {
            const errorMessage = handleError(error, 'exporting sessions');
            logWithTimestamp(`Error in handleSessionExport: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true;

      case 'sessionImport':
        handleSessionImport(message, sendResponse)
          .catch((error: any) => {
            const errorMessage = handleError(error, 'importing sessions');
            logWithTimestamp(`Error in handleSessionImport: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true;

      case 'sessionGetStats':
        handleSessionGetStats(message, sendResponse)
          .catch((error: any) => {
            const errorMessage = handleError(error, 'getting session stats');
            logWithTimestamp(`Error in handleSessionGetStats: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true;

      case 'sessionClearAll':
        handleSessionClearAll(message, sendResponse)
          .catch((error: any) => {
            const errorMessage = handleError(error, 'clearing all sessions');
            logWithTimestamp(`Error in handleSessionClearAll: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true;

      default:
        // This should never happen due to the type guard, but TypeScript requires it
        logWithTimestamp(`Unhandled message action: ${(message as any).action}`, 'warn');
        sendResponse({ success: false, error: 'Unhandled message action' });
        return false;
    }
  } catch (error) {
    const errorMessage = handleError(error, 'handling message');
    logWithTimestamp(`Error handling message: ${errorMessage}`, 'error');
    sendResponse({ success: false, error: errorMessage });
    return false;
  }
}

/**
 * Type guard to check if a message is a valid background message
 * @param message The message to check
 * @returns True if the message is a valid background message, false otherwise
 */
function isBackgroundMessage(message: any): message is BackgroundMessage {
  return (
    message &&
    typeof message === 'object' &&
    'action' in message &&
    (
      message.action === 'executePrompt' ||
      message.action === 'cancelExecution' ||
      message.action === 'clearHistory' ||
      message.action === 'initializeTab' ||
      message.action === 'switchToTab' ||
      message.action === 'getTokenUsage' ||
      message.action === 'approvalResponse' ||
      message.action === 'reflectAndLearn' ||
      message.action === 'tokenUsageUpdated' ||
      message.action === 'updateOutput' ||
      message.action === 'providerConfigChanged' ||
      message.action === 'tabStatusChanged' ||
      message.action === 'targetCreated' ||
      message.action === 'targetDestroyed' ||
      message.action === 'targetChanged' ||
      message.action === 'tabTitleChanged' ||
      message.action === 'pageDialog' ||
      message.action === 'pageConsole' ||
      message.action === 'pageError' ||
      message.action === 'forceResetPlaywright' ||
      message.action === 'requestApproval' ||
      message.action === 'checkAgentStatus' ||
      message.action === 'sessionCreate' ||
      message.action === 'sessionUpdate' ||
      message.action === 'sessionDelete' ||
      message.action === 'sessionDeleteMany' ||
      message.action === 'sessionGetAll' ||
      message.action === 'sessionGetById' ||
      message.action === 'sessionRename' ||
      message.action === 'sessionSearch' ||
      message.action === 'sessionExport' ||
      message.action === 'sessionImport' ||
      message.action === 'sessionGetStats' ||
      message.action === 'sessionClearAll'
    )
  );
}

/**
 * Handle the executePrompt message
 * @param message The message to handle
 * @param sendResponse The function to send a response
 */
function handleExecutePrompt(
  message: Extract<BackgroundMessage, { action: 'executePrompt' }>,
  sendResponse: (response?: any) => void
): void {
  // Use the tabId from the message if available
  if (message.tabId) {
    executePrompt(message.prompt, message.tabId);
  } else {
    executePrompt(message.prompt);
  }
  sendResponse({ success: true });
}

/**
 * Handle the cancelExecution message
 * @param message The message to handle
 * @param sendResponse The function to send a response
 */
function handleCancelExecution(
  message: Extract<BackgroundMessage, { action: 'cancelExecution' }>,
  sendResponse: (response?: any) => void
): void {
  cancelExecution(message.tabId);
  sendResponse({ success: true });
}

/**
 * Handle the clearHistory message
 * @param message The message to handle
 * @param sendResponse The function to send a response
 */
async function handleClearHistory(
  message: Extract<BackgroundMessage, { action: 'clearHistory' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  await clearMessageHistory(message.tabId, message.windowId);
  
  // Reset token tracking
  try {
    const tokenTracker = TokenTrackingService.getInstance();
    tokenTracker.reset(message.windowId);
    
    // Notify UI of reset
    chrome.runtime.sendMessage({
      action: 'tokenUsageUpdated',
      content: tokenTracker.getUsage(),
      tabId: message.tabId,
      windowId: message.windowId
    });
  } catch (error) {
    logWithTimestamp(`Error resetting token tracking: ${String(error)}`, 'warn');
  }
  
  sendResponse({ success: true });
}

/**
 * Handle the initializeTab message
 * @param message The message to handle
 * @param sendResponse The function to send a response
 */
function handleInitializeTab(
  message: Extract<BackgroundMessage, { action: 'initializeTab' }>,
  sendResponse: (response?: any) => void
): void {
  // Initialize the tab as soon as the side panel is opened
  if (message.tabId) {
    // Use setTimeout to make this asynchronous and return the response immediately
    setTimeout(async () => {
      try {
        // Get the tab title before attaching
        let tabTitle = "Unknown Tab";
        try {
          const tab = await chrome.tabs.get(message.tabId);
          if (tab && tab.title) {
            tabTitle = tab.title;
          }
        } catch (titleError) {
          handleError(titleError, 'getting tab title');
        }
        
        await attachToTab(message.tabId, message.windowId);
        await initializeAgent(message.tabId);
        
        // Get the tab state to check if attachment was successful
        const tabState = getTabState(message.tabId);
        if (tabState) {
          // Send a message back to the side panel with the tab title
          chrome.runtime.sendMessage({
            action: 'updateOutput',
            content: {
              type: 'system',
              content: `Connected to tab: ${tabState.title || tabTitle}`
            },
            tabId: message.tabId,
            windowId: tabState.windowId
          });
        }
        
        logWithTimestamp(`Tab ${message.tabId} in window ${message.windowId || 'unknown'} initialized from side panel`);
      } catch (error) {
        handleError(error, 'initializing tab from side panel');
      }
    }, 0);
  }
  sendResponse({ success: true });
}

/**
 * Handle the switchToTab message
 * @param message The message to handle
 * @param sendResponse The function to send a response
 */
function handleSwitchToTab(
  message: Extract<BackgroundMessage, { action: 'switchToTab' }>,
  sendResponse: (response?: any) => void
): void {
  if (message.tabId) {
    // Get the window ID for this tab if available
    const windowId = getWindowForTab(message.tabId);
    
    // Focus the window first if we have a window ID
    if (windowId) {
      chrome.windows.update(windowId, { focused: true });
    }
    
    // Then focus the tab
    chrome.tabs.update(message.tabId, { active: true });
    
    logWithTimestamp(`Switched to tab ${message.tabId} in window ${windowId || 'unknown'}`);
  }
  sendResponse({ success: true });
}

/**
 * Handle the getTokenUsage message
 * @param message The message to handle
 * @param sendResponse The function to send a response
 */
function handleGetTokenUsage(
  message: Extract<BackgroundMessage, { action: 'getTokenUsage' }>,
  sendResponse: (response?: any) => void
): void {
  try {
    const tokenTracker = TokenTrackingService.getInstance();
    const usage = tokenTracker.getUsage();
    
    // Get the window ID if available
    const windowId = message.windowId;
    const tabId = message.tabId;
    
    // Send the usage directly in the response
    sendResponse({ 
      success: true, 
      usage 
    });
    
    // Also broadcast it to all clients
    chrome.runtime.sendMessage({
      action: 'tokenUsageUpdated',
      content: usage,
      tabId,
      windowId
    });
  } catch (error) {
    const errorMessage = handleError(error, 'getting token usage');
    logWithTimestamp(`Error getting token usage: ${errorMessage}`, 'error');
    sendResponse({ success: false, error: errorMessage });
  }
}

/**
 * Handle the reflectAndLearn message
 * @param message The message to handle
 * @param sendResponse The function to send a response
 */
function handleReflectAndLearn(
  message: Extract<BackgroundMessage, { action: 'reflectAndLearn' }>,
  sendResponse: (response?: any) => void
): void {
  try {
    console.log("MEMORY DEBUG: handleReflectAndLearn called", { tabId: message.tabId });
    
    // Trigger the reflection process
    triggerReflection(message.tabId);
    
    console.log("MEMORY DEBUG: triggerReflection called successfully");
    sendResponse({ success: true });
  } catch (error) {
    console.error("MEMORY DEBUG: Error in handleReflectAndLearn", error);
    const errorMessage = handleError(error, 'triggering reflection');
    logWithTimestamp(`Error triggering reflection: ${errorMessage}`, 'error');
    sendResponse({ success: false, error: errorMessage });
  }
}

/**
 * Handle the forceResetPlaywright message
 * @param message The message to handle
 * @param sendResponse The function to send a response
 */
async function handleForceResetPlaywright(
  message: Extract<BackgroundMessage, { action: 'forceResetPlaywright' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    logWithTimestamp('Force resetting Playwright instance');
    
    // Call the forceResetPlaywright function from tabManager
    const result = await forceResetPlaywright();
    
    // Get the current tab and window ID if possible
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tabId = tabs[0]?.id;
    const windowId = tabs[0]?.windowId;
    
    // Notify UI components about the reset
    chrome.runtime.sendMessage({
      action: 'updateOutput',
      content: {
        type: 'system',
        content: `Playwright instance has been force reset. ${result ? 'Success' : 'Failed'}`
      },
      tabId,
      windowId
    });
    
    sendResponse({ success: result });
  } catch (error) {
    const errorMessage = handleError(error, 'force resetting Playwright instance');
    logWithTimestamp(`Error force resetting Playwright instance: ${errorMessage}`, 'error');
    sendResponse({ success: false, error: errorMessage });
  }
}

/**
 * Handle the checkAgentStatus message
 * @param message The message to handle
 * @param sendResponse The function to send a response
 */
async function handleCheckAgentStatus(
  message: Extract<BackgroundMessage, { action: 'checkAgentStatus' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    // Get the window ID for this tab
    const windowId = message.windowId || (message.tabId ? getWindowForTab(message.tabId) : null);
    
    if (!windowId) {
      logWithTimestamp(`Cannot check agent status: No window ID found for tab ${message.tabId}`, 'warn');
      sendResponse({ success: false, error: 'No window ID found' });
      return;
    }
    
    // Get the agent status
    const status = getAgentStatus(windowId);
    
    // Send the status back to the UI
    chrome.runtime.sendMessage({
      action: 'agentStatusUpdate',
      status: status.status,
      timestamp: status.timestamp,
      lastHeartbeat: status.lastHeartbeat,
      tabId: message.tabId,
      windowId
    });
    
    sendResponse({ success: true });
  } catch (error) {
    const errorMessage = handleError(error, 'checking agent status');
    logWithTimestamp(`Error checking agent status: ${errorMessage}`, 'error');
    sendResponse({ success: false, error: errorMessage });
  }
}

// --- Session handlers ---

async function handleSessionCreate(
  message: Extract<BackgroundMessage, { action: 'sessionCreate' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const sessionService = SessionService.getInstance();
    const session = await sessionService.create({
      name: message.name,
      tabId: message.tabId,
      tabTitle: message.tabTitle,
      windowId: message.windowId,
      url: message.url,
      provider: message.provider,
      modelId: message.modelId,
    });
    sendResponse({ success: true, session });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSessionUpdate(
  message: Extract<BackgroundMessage, { action: 'sessionUpdate' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const sessionService = SessionService.getInstance();
    const session = await sessionService.update(message.sessionId, {
      name: message.name,
      tabTitle: message.tabTitle,
      url: message.url,
    });
    sendResponse({ success: true, session });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSessionDelete(
  message: Extract<BackgroundMessage, { action: 'sessionDelete' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const sessionService = SessionService.getInstance();
    const deleted = await sessionService.delete(message.sessionId);
    sendResponse({ success: deleted });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSessionDeleteMany(
  message: Extract<BackgroundMessage, { action: 'sessionDeleteMany' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const sessionService = SessionService.getInstance();
    const count = await sessionService.deleteMany(message.sessionIds);
    sendResponse({ success: true, count });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSessionGetAll(
  message: Extract<BackgroundMessage, { action: 'sessionGetAll' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const sessionService = SessionService.getInstance();
    const sessions = await sessionService.getAll();
    sendResponse({ success: true, sessions });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSessionGetById(
  message: Extract<BackgroundMessage, { action: 'sessionGetById' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const sessionService = SessionService.getInstance();
    const session = await sessionService.getById(message.sessionId);
    sendResponse({ success: true, session });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSessionRename(
  message: Extract<BackgroundMessage, { action: 'sessionRename' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const sessionService = SessionService.getInstance();
    const session = await sessionService.rename(message.sessionId, message.name);
    sendResponse({ success: true, session });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSessionSearch(
  message: Extract<BackgroundMessage, { action: 'sessionSearch' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const sessionService = SessionService.getInstance();
    const sessions = await sessionService.search(message.query);
    sendResponse({ success: true, sessions });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSessionExport(
  message: Extract<BackgroundMessage, { action: 'sessionExport' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const sessionService = SessionService.getInstance();
    const json = await sessionService.exportToJson(message.sessionIds);
    sendResponse({ success: true, json });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSessionImport(
  message: Extract<BackgroundMessage, { action: 'sessionImport' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const sessionService = SessionService.getInstance();
    const result = await sessionService.importFromJson(message.json);
    sendResponse({ success: true, ...result });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSessionGetStats(
  message: Extract<BackgroundMessage, { action: 'sessionGetStats' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const sessionService = SessionService.getInstance();
    const stats = await sessionService.getStats();
    sendResponse({ success: true, stats });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSessionClearAll(
  message: Extract<BackgroundMessage, { action: 'sessionClearAll' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const sessionService = SessionService.getInstance();
    await sessionService.clearAll();
    sendResponse({ success: true });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Set up message listeners
 */
export function setupMessageListeners(): void {
  chrome.runtime.onMessage.addListener(handleMessage);
}
