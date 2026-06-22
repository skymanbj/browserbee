import React, { useState } from 'react';
import { Message } from '../types';
import { LlmContent } from './LlmContent';
import { ScreenshotMessage } from './ScreenshotMessage';

interface MessageDisplayProps {
  messages: Message[];
  streamingSegments: Record<number, string>;
  isStreaming: boolean;
  onDeleteMessage: (index: number) => void;
}

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

export const MessageDisplay: React.FC<MessageDisplayProps> = ({
  messages,
  streamingSegments,
  isStreaming,
  onDeleteMessage
}) => {
  // Always show all messages
  const filteredMessages = messages;

  if (filteredMessages.length === 0 && Object.keys(streamingSegments).length === 0) {
    return <p className="text-gray-500">No output yet</p>;
  }

  return (
    <div>
      {/* Render completed messages in their original order */}
      {filteredMessages.map((msg, index) => (
        <div key={`msg-${index}`} className="mb-2 flex items-start justify-between gap-2 relative">
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
            onClick={() => onDeleteMessage(index)}
            className="btn btn-ghost btn-xs btn-circle opacity-25 hover:opacity-100 transition-opacity text-error flex-shrink-0 self-center"
            title="Delete this message"
          >
            ✕
          </button>
        </div>
      ))}
      
      {/* Render currently streaming segments at the end */}
      {isStreaming && Object.entries(streamingSegments).map(([id, content]) => (
        <div key={`segment-${id}`} className="mb-2 animate-pulse pr-8">
          <LlmContent content={content} />
        </div>
      ))}
    </div>
  );
};
