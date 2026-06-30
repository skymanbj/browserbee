import { sendUIMessage } from './utils';

// Maps of windowId -> state
const windowStreamingBuffers = new Map<number, string>();
const windowSegmentIds = new Map<number, number>();

// Combined tool call regex and sentence end regex
const combinedToolCallRegex = /(```(?:xml|bash)\s*)?<tool>(.*?)<\/tool>\s*<input>([\s\S]*?)<\/input>(?:\s*<requires_approval>(.*?)<\/requires_approval>)?(\s*```)?/;
const sentenceEndRegex = /[.!?]\s+/;

// Default window ID for contexts without windowId
const DEFAULT_WINDOW_ID = -1;

function getStreamingBufferForWindow(windowId?: number): string {
  const wId = windowId !== undefined && windowId !== null ? windowId : DEFAULT_WINDOW_ID;
  return windowStreamingBuffers.get(wId) || '';
}

function setStreamingBufferForWindow(content: string, windowId?: number): void {
  const wId = windowId !== undefined && windowId !== null ? windowId : DEFAULT_WINDOW_ID;
  windowStreamingBuffers.set(wId, content);
}

/**
 * Reset streaming state
 */
export function resetStreamingState(windowId?: number): void {
  setStreamingBufferForWindow('', windowId);
  const wId = windowId !== undefined && windowId !== null ? windowId : DEFAULT_WINDOW_ID;
  windowSegmentIds.set(wId, 0);
}

/**
 * Get the current segment ID
 * @returns The current segment ID
 */
export function getCurrentSegmentId(windowId?: number): number {
  const wId = windowId !== undefined && windowId !== null ? windowId : DEFAULT_WINDOW_ID;
  return windowSegmentIds.get(wId) || 0;
}

/**
 * Increment the segment ID
 * @returns The new segment ID
 */
export function incrementSegmentId(windowId?: number): number {
  const wId = windowId !== undefined && windowId !== null ? windowId : DEFAULT_WINDOW_ID;
  const current = windowSegmentIds.get(wId) || 0;
  const next = current + 1;
  windowSegmentIds.set(wId, next);
  return next;
}

/**
 * Process the streaming buffer to send complete sentences and tool calls
 * @param tabId The tab ID to send messages to
 * @param windowId The window ID to send messages to
 */
export function processStreamingBuffer(tabId?: number, windowId?: number): void {
  const buffer = getStreamingBufferForWindow(windowId);

  // Check if buffer contains a complete tool call (either direct or in a code block)
  const toolCallMatch = buffer.match(combinedToolCallRegex);
  
  if (toolCallMatch) {
    // When a tool call is detected, we don't send any more streaming chunks
    // The entire segment (including text before the tool call) will be finalized together
    // This prevents duplication of content in the UI
    
    // We keep the entire buffer intact, including the tool call
    // It will be handled by onSegmentComplete after the tool execution
    
    return;
  }
  
  // If no complete tool call, check for complete sentences
  const sentenceMatch = buffer.match(sentenceEndRegex);
  
  if (sentenceMatch) {
    const lastSentenceEnd = buffer.lastIndexOf(sentenceMatch[0]) + sentenceMatch[0].length;
    
    // Send complete sentences
    sendUIMessage('updateStreamingChunk', {
      type: 'llm',
      content: buffer.substring(0, lastSentenceEnd)
    }, tabId, windowId);
    
    // Keep remainder in buffer
    setStreamingBufferForWindow(buffer.substring(lastSentenceEnd), windowId);
  } else if (buffer.length > 100) {
    // If buffer is getting long without sentence breaks, send it anyway
    sendUIMessage('updateStreamingChunk', {
      type: 'llm',
      content: buffer
    }, tabId, windowId);
    setStreamingBufferForWindow('', windowId);
  }
  // Otherwise keep accumulating in buffer
}

/**
 * Add a chunk to the streaming buffer
 * @param chunk The chunk to add
 * @param tabId The tab ID to send messages to
 * @param windowId The window ID to send messages to
 */
export function addToStreamingBuffer(chunk: string, tabId?: number, windowId?: number): void {
  const current = getStreamingBufferForWindow(windowId);
  setStreamingBufferForWindow(current + chunk, windowId);
  processStreamingBuffer(tabId, windowId);
}

/**
 * Get the current streaming buffer content
 * @returns The current streaming buffer content
 */
export function getStreamingBuffer(windowId?: number): string {
  return getStreamingBufferForWindow(windowId);
}

/**
 * Set the streaming buffer content
 * @param content The content to set
 */
export function setStreamingBuffer(content: string, windowId?: number): void {
  setStreamingBufferForWindow(content, windowId);
}

/**
 * Clear any remaining content in the streaming buffer
 * @param tabId The tab ID to send messages to
 * @param windowId The window ID to send messages to
 */
export function clearStreamingBuffer(tabId?: number, windowId?: number): void {
  const buffer = getStreamingBufferForWindow(windowId);
  if (buffer.length > 0) {
    sendUIMessage('updateStreamingChunk', {
      type: 'llm',
      content: buffer
    }, tabId, windowId);
    setStreamingBufferForWindow('', windowId);
  }
}

/**
 * Finalize a streaming segment
 * @param segmentId The segment ID to finalize
 * @param content The content of the segment
 * @param tabId The tab ID to send messages to
 * @param windowId The window ID to send messages to
 */
export function finalizeStreamingSegment(segmentId: number, content: string, tabId?: number, windowId?: number): void {
  sendUIMessage('finalizeStreamingSegment', {
    id: segmentId,
    content
  }, tabId, windowId);
}

/**
 * Start a new streaming segment
 * @param segmentId The segment ID to start
 * @param tabId The tab ID to send messages to
 * @param windowId The window ID to send messages to
 */
export function startNewSegment(segmentId: number, tabId?: number, windowId?: number): void {
  sendUIMessage('startNewSegment', {
    id: segmentId
  }, tabId, windowId);
}

/**
 * Signal that streaming is complete
 * @param tabId The tab ID to send messages to
 * @param windowId The window ID to send messages to
 */
export function signalStreamingComplete(tabId?: number, windowId?: number): void {
  sendUIMessage('streamingComplete', null, tabId, windowId);
}
