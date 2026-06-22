import React, { useState, useEffect } from 'react';
import { Message } from '../types';
import { LlmContent } from './LlmContent';
import { ScreenshotMessage } from './ScreenshotMessage';

interface MessageDisplayProps {
  messages: Message[];
  streamingSegments: Record<number, string>;
  isStreaming: boolean;
  onDeleteMessage: (index: number) => void;
  isProcessing: boolean;
}

interface RenderItem {
  type: 'single' | 'tool_group';
  message?: Message;
  originalIndex?: number;
  groupMessages?: { message: Message; originalIndex: number }[];
}

const groupMessages = (messages: Message[]): RenderItem[] => {
  const items: RenderItem[] = [];
  let currentGroup: { message: Message; originalIndex: number }[] = [];

  const flushGroup = () => {
    if (currentGroup.length > 0) {
      if (currentGroup.length === 1) {
        items.push({
          type: 'single',
          message: currentGroup[0].message,
          originalIndex: currentGroup[0].originalIndex
        });
      } else {
        items.push({
          type: 'tool_group',
          groupMessages: [...currentGroup]
        });
      }
      currentGroup = [];
    }
  };

  messages.forEach((msg, index) => {
    const isTool = msg.type === 'system' && (msg.content.startsWith('tool:') || msg.content.includes('tool: '));
    if (isTool) {
      currentGroup.push({ message: msg, originalIndex: index });
    } else {
      flushGroup();
      items.push({
        type: 'single',
        message: msg,
        originalIndex: index
      });
    }
  });

  flushGroup();
  return items;
};

const CollapsibleWrapper: React.FC<{
  children: React.ReactNode;
  content: string;
  bgClass: string;
  limit?: number;
}> = ({ children, content, bgClass, limit = 500 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (content.length <= limit) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div 
        className={`transition-all duration-300 overflow-hidden ${
          isExpanded ? 'max-h-none pb-2' : 'max-h-[160px]'
        }`}
      >
        {children}
        
        {!isExpanded && (
          <div className={`absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t ${bgClass} to-transparent pointer-events-none`} />
        )}
      </div>
      
      <div className="mt-1 flex justify-start">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn btn-link btn-xs p-0 text-primary no-underline hover:underline font-bold"
        >
          {isExpanded ? '收起 ↑' : '展开全文 ↓'}
        </button>
      </div>
    </div>
  );
};

const ToolGroup: React.FC<{
  groupMessages: { message: Message; originalIndex: number }[];
  isProcessing: boolean;
  onDeleteMessage: (index: number) => void;
}> = ({ groupMessages, isProcessing, onDeleteMessage }) => {
  const [isOpen, setIsOpen] = useState(isProcessing);

  useEffect(() => {
    setIsOpen(isProcessing);
  }, [isProcessing]);

  return (
    <div className="border border-base-content border-opacity-10 rounded-lg overflow-hidden my-2 bg-base-200 bg-opacity-30">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-2 cursor-pointer bg-base-200 hover:bg-opacity-80 text-xs font-semibold text-gray-600 select-none"
      >
        <div className="flex items-center gap-1.5">
          <span>⚙️</span>
          <span>自动操作步骤 (共 {groupMessages.length} 步)</span>
          {isProcessing && <span className="loading loading-double-ring loading-xs text-primary ml-1"></span>}
        </div>
        <span className="text-gray-400 font-bold">
          {isOpen ? '收起 ↑' : '展开 ↓'}
        </span>
      </div>

      {isOpen && (
        <div className="p-2 space-y-1 bg-base-100 bg-opacity-50 max-h-[300px] overflow-y-auto">
          {groupMessages.map(({ message, originalIndex }) => (
            <div key={`group-msg-${originalIndex}`} className="flex items-start justify-between gap-2 relative text-xs py-0.5 border-b border-base-content border-opacity-5 last:border-0">
              <div className="flex-grow min-w-0 bg-base-200 px-2 py-1 rounded text-gray-500 font-mono overflow-x-auto whitespace-pre-wrap">
                {message.content}
              </div>
              <button
                onClick={() => onDeleteMessage(originalIndex)}
                className="btn btn-ghost btn-xs btn-circle opacity-25 hover:opacity-100 transition-opacity text-error flex-shrink-0 self-center"
                title="Delete this step"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const MessageDisplay: React.FC<MessageDisplayProps> = ({
  messages,
  streamingSegments,
  isStreaming,
  onDeleteMessage,
  isProcessing
}) => {
  // Always show all messages
  const filteredMessages = messages;

  if (filteredMessages.length === 0 && Object.keys(streamingSegments).length === 0) {
    return <p className="text-gray-500">No output yet</p>;
  }

  const groupedItems = groupMessages(filteredMessages);

  return (
    <div>
      {/* Render completed messages in their original order */}
      {groupedItems.map((item, index) => {
        if (item.type === 'tool_group' && item.groupMessages) {
          return (
            <ToolGroup
              key={`tool-group-${index}`}
              groupMessages={item.groupMessages}
              isProcessing={isProcessing}
              onDeleteMessage={onDeleteMessage}
            />
          );
        }

        const msg = item.message!;
        const originalIndex = item.originalIndex!;

        return (
          <div key={`msg-${originalIndex}`} className="mb-2 flex items-start justify-between gap-2 relative">
            <div className="flex-grow min-w-0">
              {msg.type === 'system' ? (
                <CollapsibleWrapper content={msg.content} bgClass="from-base-200">
                  <div className="bg-base-200 px-3 py-1 rounded text-gray-500 text-sm">
                    {msg.content}
                  </div>
                </CollapsibleWrapper>
              ) : msg.type === 'screenshot' && msg.imageData ? (
                <ScreenshotMessage imageData={msg.imageData} mediaType={msg.mediaType} />
              ) : (
                <CollapsibleWrapper content={msg.content} bgClass="from-base-100">
                  <LlmContent content={msg.content} />
                </CollapsibleWrapper>
              )}
            </div>
            <button
              onClick={() => onDeleteMessage(originalIndex)}
              className="btn btn-ghost btn-xs btn-circle opacity-25 hover:opacity-100 transition-opacity text-error flex-shrink-0 self-center"
              title="Delete this message"
            >
              ✕
            </button>
          </div>
        );
      })}
      
      {/* Render currently streaming segments at the end */}
      {isStreaming && Object.entries(streamingSegments).map(([id, content]) => (
        <div key={`segment-${id}`} className="mb-2 animate-pulse pr-8">
          <LlmContent content={content} />
        </div>
      ))}
    </div>
  );
};
