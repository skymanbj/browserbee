import { useEffect, useRef, useState } from 'react';
import { SessionManager } from '../../background/sessionManager';
import { ChatSession } from '../../types/session';
import { Message } from '../types';
import { FileAttachment } from '../../background/types';

export const useMessageManagement = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingSegments, setStreamingSegments] = useState<Record<number, string>>({});
  const [currentSegmentId, setCurrentSegmentId] = useState<number>(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Session states
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [tabInfo, setTabInfo] = useState<{ tabId: number; windowId: number } | null>(null);

  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages or streaming segments change
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [messages, streamingSegments]);

  // Method to bind tab and window context, triggering session loading
  const initSessions = (tId: number, wId: number) => {
    setTabInfo({ tabId: tId, windowId: wId });
  };

  // Load sessions and set up initial state when tabInfo is available
  useEffect(() => {
    if (!tabInfo) return;
    const { tabId, windowId } = tabInfo;

    const loadSessions = () => {
      chrome.runtime.sendMessage({
        action: 'getSessions',
        tabId,
        windowId
      }, (response) => {
        if (response && response.success) {
          setSessions(response.sessions || []);
          if (response.activeSessionId) {
            setActiveSessionId(response.activeSessionId);
            const activeSession = (response.sessions as ChatSession[]).find(s => s.id === response.activeSessionId);
            if (activeSession) {
              setMessages(activeSession.messages || []);
            }
          }
        }
      });
    };

    loadSessions();

    // Listen for storage updates to refresh UI sessions dynamically
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && (changes['browserbee_chat_sessions'] || changes[`browserbee_active_session_${windowId}`])) {
        loadSessions();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [tabInfo]);

  // Create a new session
  const createNewSession = async (title?: string) => {
    if (!tabInfo) return;
    const { tabId, windowId } = tabInfo;
    
    // Ensure title is a string, filtering out potential React MouseEvents
    const cleanTitle = typeof title === 'string' ? title : undefined;

    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({
        action: 'createSession',
        title: cleanTitle,
        tabId,
        windowId
      }, (response) => {
        if (response && response.success && response.session) {
          const newSession = response.session;
          setSessions(prev => [newSession, ...prev]);
          setActiveSessionId(newSession.id);
          setMessages([]);
        }
        resolve();
      });
    });
  };

  // Switch to a different session
  const switchSession = async (sessionId: string) => {
    if (!tabInfo) return;
    const { tabId, windowId } = tabInfo;

    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({
        action: 'setActiveSession',
        sessionId,
        tabId,
        windowId
      }, (response) => {
        if (response && response.success && response.session) {
          setActiveSessionId(sessionId);
          setMessages(response.session.messages || []);
        }
        resolve();
      });
    });
  };

  // Delete a session
  const deleteSession = async (sessionId: string) => {
    if (!tabInfo) return;
    const { tabId, windowId } = tabInfo;

    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({
        action: 'deleteSession',
        sessionId,
        tabId,
        windowId
      }, (response) => {
        if (response && response.success) {
          setSessions(response.sessions || []);
          if (response.activeSessionId) {
            setActiveSessionId(response.activeSessionId);
            const activeSession = (response.sessions as ChatSession[]).find(s => s.id === response.activeSessionId);
            setMessages(activeSession ? (activeSession.messages || []) : []);
          } else {
            setActiveSessionId(null);
            setMessages([]);
          }
        }
        resolve();
      });
    });
  };

  // Rename a session
  const renameSession = async (sessionId: string, title: string) => {
    if (!tabInfo) return;
    const { tabId, windowId } = tabInfo;

    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({
        action: 'renameSession',
        sessionId,
        title,
        tabId,
        windowId
      }, (response) => {
        if (response && response.success) {
          setSessions(response.sessions || []);
        }
        resolve();
      });
    });
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, { ...message, isComplete: true }]);
  };

  const addSystemMessage = (content: string, attachments?: FileAttachment[]) => {
    addMessage({ type: 'system', content, attachments });
  };

  const updateStreamingChunk = (content: string) => {
    setIsStreaming(true);
    setStreamingSegments(prev => ({
      ...prev,
      [currentSegmentId]: (prev[currentSegmentId] || '') + content
    }));
  };

  const finalizeStreamingSegment = (id: number, content: string) => {
    // Add the finalized segment as a complete message
    addMessage({ 
      type: 'llm', 
      content,
      segmentId: id
    });
    
    // Remove the segment from streaming segments
    setStreamingSegments(prev => {
      const newSegments = { ...prev };
      delete newSegments[id];
      return newSegments;
    });
  };

  const startNewSegment = (id: number) => {
    setCurrentSegmentId(id);
  };

  const completeStreaming = () => {
    setIsStreaming(false);
    setStreamingSegments({});
  };

  const clearMessages = () => {
    setMessages([]);
    setStreamingSegments({});
  };

  const deleteMessage = async (index: number) => {
    const newMessages = messages.filter((_, idx) => idx !== index);
    setMessages(newMessages);
    if (activeSessionId) {
      const session = await SessionManager.getSession(activeSessionId);
      if (session) {
        await SessionManager.updateSession(activeSessionId, newMessages, session.agentHistory);
      }
    }
  };

  const deleteMultipleMessages = async (indexes: number[]) => {
    const newMessages = messages.filter((_, idx) => !indexes.includes(idx));
    setMessages(newMessages);
    if (activeSessionId) {
      const session = await SessionManager.getSession(activeSessionId);
      if (session) {
        await SessionManager.updateSession(activeSessionId, newMessages, session.agentHistory);
      }
    }
  };

  const saveMessagesToSession = async () => {
    if (!activeSessionId || messages.length === 0) return;
    
    try {
      const session = await SessionManager.getSession(activeSessionId);
      if (session) {
        await SessionManager.updateSession(activeSessionId, messages, session.agentHistory);
      }
    } catch (error) {
      console.error('Failed to save messages to session:', error);
    }
  };

  return {
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
    // Session values
    sessions,
    activeSessionId,
    initSessions,
    createNewSession,
    switchSession,
    deleteSession,
    renameSession
  };
};
