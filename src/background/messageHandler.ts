import { handleApprovalResponse } from '../agent/approvalManager';
import { TokenTrackingService } from '../tracking/tokenTrackingService';
import { cancelExecution, clearMessageHistory, executePrompt, getAgentStatus, initializeAgent } from './agentController';
import { triggerReflection } from './reflectionController';
import { ScheduledTaskService } from './scheduledTaskService';
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
        return true;

      case 'cancelExecution':
        handleCancelExecution(message, sendResponse);
        return true;

      case 'clearHistory':
        handleClearHistory(message, sendResponse)
          .catch(error => {
            const errorMessage = handleError(error, 'clearing history');
            logWithTimestamp(`Error in async handleClearHistory: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true;

      case 'initializeTab':
        handleInitializeTab(message, sendResponse);
        return true;
        
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
        sendResponse({ success: true });
        return true;
        
      case 'updateOutput':
        sendResponse({ success: true });
        return true;
        
      case 'providerConfigChanged':
        sendResponse({ success: true });
        return true;
        
      case 'forceResetPlaywright':
        handleForceResetPlaywright(message, sendResponse)
          .catch(error => {
            const errorMessage = handleError(error, 'force resetting Playwright');
            logWithTimestamp(`Error in async handleForceResetPlaywright: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true;
        
      case 'requestApproval':
        sendResponse({ success: true });
        return true;
        
      case 'checkAgentStatus':
        handleCheckAgentStatus(message, sendResponse)
          .catch(error => {
            const errorMessage = handleError(error, 'checking agent status');
            logWithTimestamp(`Error in async handleCheckAgentStatus: ${errorMessage}`, 'error');
            sendResponse({ success: false, error: errorMessage });
          });
        return true;

      // ==================== Scheduled Task Handlers ====================

      case 'scheduledTaskCreate':
        handleScheduledTaskCreate(message, sendResponse);
        return true;

      case 'scheduledTaskUpdate':
        handleScheduledTaskUpdate(message, sendResponse);
        return true;

      case 'scheduledTaskDelete':
        handleScheduledTaskDelete(message, sendResponse);
        return true;

      case 'scheduledTaskDeleteMany':
        handleScheduledTaskDeleteMany(message, sendResponse);
        return true;

      case 'scheduledTaskGetAll':
        handleScheduledTaskGetAll(message, sendResponse);
        return true;

      case 'scheduledTaskGetById':
        handleScheduledTaskGetById(message, sendResponse);
        return true;

      case 'scheduledTaskEnable':
        handleScheduledTaskEnable(message, sendResponse);
        return true;

      case 'scheduledTaskPause':
        handleScheduledTaskPause(message, sendResponse);
        return true;

      case 'scheduledTaskRunNow':
        handleScheduledTaskRunNow(message, sendResponse);
        return true;

      case 'scheduledTaskExport':
        handleScheduledTaskExport(message, sendResponse);
        return true;

      case 'scheduledTaskImport':
        handleScheduledTaskImport(message, sendResponse);
        return true;

      case 'scheduledTaskGetLogs':
        handleScheduledTaskGetLogs(message, sendResponse);
        return true;

      case 'scheduledTaskGetStats':
        handleScheduledTaskGetStats(message, sendResponse);
        return true;

      case 'scheduledTaskStatus':
        sendResponse({ success: true });
        return true;

      default:
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
      message.action === 'scheduledTaskCreate' ||
      message.action === 'scheduledTaskUpdate' ||
      message.action === 'scheduledTaskDelete' ||
      message.action === 'scheduledTaskDeleteMany' ||
      message.action === 'scheduledTaskGetAll' ||
      message.action === 'scheduledTaskGetById' ||
      message.action === 'scheduledTaskEnable' ||
      message.action === 'scheduledTaskPause' ||
      message.action === 'scheduledTaskRunNow' ||
      message.action === 'scheduledTaskExport' ||
      message.action === 'scheduledTaskImport' ||
      message.action === 'scheduledTaskGetLogs' ||
      message.action === 'scheduledTaskGetStats' ||
      message.action === 'scheduledTaskStatus'
    )
  );
}

// ==================== Original Handlers (unchanged) ====================

function handleExecutePrompt(
  message: Extract<BackgroundMessage, { action: 'executePrompt' }>,
  sendResponse: (response?: any) => void
): void {
  if (message.tabId) {
    executePrompt(message.prompt, message.tabId);
  } else {
    executePrompt(message.prompt);
  }
  sendResponse({ success: true });
}

function handleCancelExecution(
  message: Extract<BackgroundMessage, { action: 'cancelExecution' }>,
  sendResponse: (response?: any) => void
): void {
  cancelExecution(message.tabId);
  sendResponse({ success: true });
}

async function handleClearHistory(
  message: Extract<BackgroundMessage, { action: 'clearHistory' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  await clearMessageHistory(message.tabId, message.windowId);
  
  try {
    const tokenTracker = TokenTrackingService.getInstance();
    tokenTracker.reset(message.windowId);
    
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

function handleInitializeTab(
  message: Extract<BackgroundMessage, { action: 'initializeTab' }>,
  sendResponse: (response?: any) => void
): void {
  if (message.tabId) {
    setTimeout(async () => {
      try {
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
        
        const tabState = getTabState(message.tabId);
        if (tabState) {
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

function handleSwitchToTab(
  message: Extract<BackgroundMessage, { action: 'switchToTab' }>,
  sendResponse: (response?: any) => void
): void {
  if (message.tabId) {
    const windowId = getWindowForTab(message.tabId);
    
    if (windowId) {
      chrome.windows.update(windowId, { focused: true });
    }
    
    chrome.tabs.update(message.tabId, { active: true });
    
    logWithTimestamp(`Switched to tab ${message.tabId} in window ${windowId || 'unknown'}`);
  }
  sendResponse({ success: true });
}

function handleGetTokenUsage(
  message: Extract<BackgroundMessage, { action: 'getTokenUsage' }>,
  sendResponse: (response?: any) => void
): void {
  try {
    const tokenTracker = TokenTrackingService.getInstance();
    const usage = tokenTracker.getUsage();
    
    sendResponse({ 
      success: true, 
      usage 
    });
    
    chrome.runtime.sendMessage({
      action: 'tokenUsageUpdated',
      content: usage,
      tabId: message.tabId,
      windowId: message.windowId
    });
  } catch (error) {
    const errorMessage = handleError(error, 'getting token usage');
    logWithTimestamp(`Error getting token usage: ${errorMessage}`, 'error');
    sendResponse({ success: false, error: errorMessage });
  }
}

function handleReflectAndLearn(
  message: Extract<BackgroundMessage, { action: 'reflectAndLearn' }>,
  sendResponse: (response?: any) => void
): void {
  try {
    console.log("MEMORY DEBUG: handleReflectAndLearn called", { tabId: message.tabId });
    
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

async function handleForceResetPlaywright(
  message: Extract<BackgroundMessage, { action: 'forceResetPlaywright' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    logWithTimestamp('Force resetting Playwright instance');
    
    const result = await forceResetPlaywright();
    
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tabId = tabs[0]?.id;
    const windowId = tabs[0]?.windowId;
    
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

async function handleCheckAgentStatus(
  message: Extract<BackgroundMessage, { action: 'checkAgentStatus' }>,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const windowId = message.windowId || (message.tabId ? getWindowForTab(message.tabId) : null);
    
    if (!windowId) {
      logWithTimestamp(`Cannot check agent status: No window ID found for tab ${message.tabId}`, 'warn');
      sendResponse({ success: false, error: 'No window ID found' });
      return;
    }
    
    const status = getAgentStatus(windowId);
    
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

// ==================== Scheduled Task Handlers ====================

function getTaskService(): ScheduledTaskService {
  return ScheduledTaskService.getInstance();
}

async function handleScheduledTaskCreate(
  message: any,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const task = await getTaskService().create(message.task);
    sendResponse({ success: true, task });
  } catch (error: any) {
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleScheduledTaskUpdate(
  message: any,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const task = await getTaskService().update(message.taskId, message.updates);
    sendResponse({ success: true, task });
  } catch (error: any) {
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleScheduledTaskDelete(
  message: any,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const deleted = await getTaskService().delete(message.taskId);
    sendResponse({ success: deleted });
  } catch (error: any) {
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleScheduledTaskDeleteMany(
  message: any,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const count = await getTaskService().deleteMany(message.taskIds);
    sendResponse({ success: true, count });
  } catch (error: any) {
    sendResponse({ success: false, error: String(error) });
  }
}

function handleScheduledTaskGetAll(
  message: any,
  sendResponse: (response?: any) => void
): void {
  try {
    const tasks = getTaskService().getAll();
    sendResponse({ success: true, tasks });
  } catch (error: any) {
    sendResponse({ success: false, error: String(error) });
  }
}

function handleScheduledTaskGetById(
  message: any,
  sendResponse: (response?: any) => void
): void {
  try {
    const task = getTaskService().getById(message.taskId);
    sendResponse({ success: true, task });
  } catch (error: any) {
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleScheduledTaskEnable(
  message: any,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const task = await getTaskService().enable(message.taskId);
    sendResponse({ success: true, task });
  } catch (error: any) {
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleScheduledTaskPause(
  message: any,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const task = await getTaskService().pause(message.taskId);
    sendResponse({ success: true, task });
  } catch (error: any) {
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleScheduledTaskRunNow(
  message: any,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const result = await getTaskService().runNow(message.taskId);
    sendResponse({ success: result });
  } catch (error: any) {
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleScheduledTaskExport(
  message: any,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const json = await getTaskService().exportToJson();
    sendResponse({ success: true, json });
  } catch (error: any) {
    sendResponse({ success: false, error: String(error) });
  }
}

async function handleScheduledTaskImport(
  message: any,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    const count = await getTaskService().importFromJson(message.json);
    sendResponse({ success: true, count });
  } catch (error: any) {
    sendResponse({ success: false, error: String(error) });
  }
}

function handleScheduledTaskGetLogs(
  message: any,
  sendResponse: (response?: any) => void
): void {
  try {
    const logs = getTaskService().getExecutionLogs(message.taskId, message.limit);
    sendResponse({ success: true, logs });
  } catch (error: any) {
    sendResponse({ success: false, error: String(error) });
  }
}

function handleScheduledTaskGetStats(
  message: any,
  sendResponse: (response?: any) => void
): void {
  try {
    const stats = getTaskService().getStats();
    sendResponse({ success: true, stats });
  } catch (error: any) {
    sendResponse({ success: false, error: String(error) });
  }
}

/**
 * Set up message listeners
 */
export function setupMessageListeners(): void {
  chrome.runtime.onMessage.addListener(handleMessage);
}
