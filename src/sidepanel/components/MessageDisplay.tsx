import React from 'react';
import { Message } from '../types';
import { LlmContent } from './LlmContent';
import { ScreenshotMessage } from './ScreenshotMessage';

interface MessageDisplayProps {
  messages: Message[];
  streamingSegments: Record<number, string>;
  isStreaming: boolean;
  onDeleteMessage: (index: number) => void;
}

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
              <div className="bg-base-200 px-3 py-1 rounded text-gray-500 text-sm">
                {msg.content}
              </div>
            ) : msg.type === 'screenshot' && msg.imageData ? (
              <ScreenshotMessage imageData={msg.imageData} mediaType={msg.mediaType} />
            ) : (
              <LlmContent content={msg.content} />
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
