import React, { useState, useEffect } from 'react';
import { Message } from '../types';
import { FileAttachment } from '../../background/types';
import { LlmContent } from './LlmContent';
import { ScreenshotMessage } from './ScreenshotMessage';
import { AttachmentPreview } from './AttachmentPreview';

interface MessageDisplayProps {
  messages: Message[];
  streamingSegments: Record<number, string>;
  isStreaming: boolean;
  onDeleteMessage: (index: number) => void;
  onDeleteTurn: (indexes: number[]) => void;
  onEditTurn: (promptIndex: number, newPrompt: string, attachments?: FileAttachment[]) => void;
  isProcessing: boolean;
}

interface ConversationTurn {
  prompt: string;
  promptMessageIndex: number;
  attachments?: FileAttachment[];
  messages: { message: Message; originalIndex: number }[];
}

interface RenderItem {
  type: 'initial_system' | 'turn';
  message?: Message;
  originalIndex?: number;
  turn?: ConversationTurn;
}

interface GroupedRenderItem {
  type: 'single' | 'tool_group';
  message?: Message;
  originalIndex?: number;
  groupMessages?: { message: Message; originalIndex: number }[];
}

const groupMessages = (messages: Message[]): GroupedRenderItem[] => {
  const items: GroupedRenderItem[] = [];
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

const segmentConversations = (messages: Message[]): RenderItem[] => {
  const items: RenderItem[] = [];
  let currentTurn: ConversationTurn | null = null;

  messages.forEach((msg, index) => {
    const isNewPrompt = msg.type === 'system' && msg.content.startsWith('New prompt: "') && (msg.content.endsWith('"') || msg.content.includes('attachment'));

    if (isNewPrompt) {
      if (currentTurn) {
        items.push({ type: 'turn', turn: currentTurn });
      }
      let promptText: string;
      if (msg.content.endsWith('"')) {
        promptText = msg.content.substring('New prompt: "'.length, msg.content.length - 1);
      } else {
        const match = msg.content.match(/New prompt: "(.*?)"(?:\s*\(\d+ attachment)/);
        promptText = match ? match[1] : msg.content.substring('New prompt: "'.length);
      }
      currentTurn = {
        prompt: promptText,
        promptMessageIndex: index,
        attachments: msg.attachments,
        messages: []
      };
    } else {
      if (currentTurn === null) {
        items.push({
          type: 'initial_system',
          message: msg,
          originalIndex: index
        });
      } else {
        currentTurn.messages.push({ message: msg, originalIndex: index });
      }
    }
  });

  if (currentTurn) {
    items.push({ type: 'turn', turn: currentTurn });
  }

  return items;
};

const CollapsibleWrapper: React.FC<{
  children: React.ReactNode;
  content: string;
  bgClass: string;
  limit?: number;
  defaultExpanded?: boolean;
}> = ({ children, content, bgClass, limit = 500, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // 当任务完成（defaultExpanded 由 false 变为 true）时自动展开结果
  useEffect(() => {
    if (defaultExpanded) {
      setIsExpanded(true);
    }
  }, [defaultExpanded]);

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
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
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
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center justify-between px-3 py-2 cursor-pointer bg-base-200 hover:bg-opacity-80 text-xs font-semibold text-base-content/70 select-none"
      >
        <div className="flex items-center gap-1.5">
          <span>⚙️</span>
          <span>自动操作步骤 (共 {groupMessages.length} 步)</span>
          {isProcessing && <span className="loading loading-double-ring loading-xs text-primary ml-1"></span>}
        </div>
        <span className="text-base-content/50 font-bold">
          {isOpen ? '收起 ↑' : '展开 ↓'}
        </span>
      </div>

      {isOpen && (
        <div className="p-2 space-y-1 bg-base-100 bg-opacity-50 max-h-[300px] overflow-y-auto">
          {groupMessages.map(({ message, originalIndex }) => (
            <div key={`group-msg-${originalIndex}`} className="flex items-start justify-between gap-2 relative text-xs py-0.5 border-b border-base-content border-opacity-5 last:border-0">
              <div className="flex-grow min-w-0 bg-base-200 px-2 py-1 rounded text-base-content/60 font-mono overflow-x-auto whitespace-pre-wrap">
                {message.content}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMessage(originalIndex);
                }}
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

const ConversationTurnComponent: React.FC<{
  turn: ConversationTurn;
  isLast: boolean;
  isProcessing: boolean;
  onDeleteTurn: (indexes: number[]) => void;
  onDeleteMessage: (index: number) => void;
  onEditTurn: (promptIndex: number, newPrompt: string, attachments?: FileAttachment[]) => void;
}> = ({ turn, isLast, isProcessing, onDeleteTurn, onDeleteMessage, onEditTurn }) => {
  const shouldDefaultOpen = isLast && isProcessing;
  const [isOpen, setIsOpen] = useState(shouldDefaultOpen);
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(turn.prompt);

  useEffect(() => {
    if (isLast) {
      // 处理中保持展开；任务完成时也保持展开，让最终结果直接可见，避免误以为失败
      setIsOpen(true);
    }
  }, [isProcessing, isLast]);

  useEffect(() => {
    setEditVal(turn.prompt);
  }, [turn.prompt]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allIndexes = [turn.promptMessageIndex, ...turn.messages.map(m => m.originalIndex)];
    if (confirm(`删除这轮对话吗？`)) {
      onDeleteTurn(allIndexes);
    }
  };

  const turnGroupedItems = groupMessages(turn.messages.map(m => m.message));

  return (
    <div className="border border-base-content border-opacity-10 rounded-lg overflow-hidden my-3 shadow-sm bg-base-100">
      {isEditing ? (
        <div 
          className="p-3 bg-base-200 border-b border-base-content border-opacity-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-semibold text-base-content/60 mb-1.5 flex items-center gap-1">
            <span>✏️ 编辑提问:</span>
          </div>
          <textarea
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            className="w-full text-sm p-2 rounded border border-gray-300 focus:outline-none focus:border-primary bg-white text-gray-800"
            rows={3}
            style={{ resize: 'vertical' }}
            autoFocus
          />
          <div className="flex gap-2 justify-end mt-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditVal(turn.prompt);
              }}
              className="btn btn-ghost btn-xs"
            >
              取消
            </button>
            <button
              onClick={() => {
                if (editVal.trim()) {
                  onEditTurn(turn.promptMessageIndex, editVal.trim(), turn.attachments);
                  setIsEditing(false);
                }
              }}
              className="btn btn-primary btn-xs text-white"
              disabled={!editVal.trim() || isProcessing}
            >
              保存并提交
            </button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between px-3 py-2.5 cursor-pointer bg-base-200 hover:bg-opacity-80 text-sm font-medium text-base-content select-none"
        >
          <div className="flex items-center gap-2 flex-grow min-w-0 pr-2">
            <span className="text-primary font-bold flex-shrink-0">问:</span>
            <span className="truncate flex-grow text-base-content font-medium" title={turn.prompt}>{turn.prompt}</span>
            {turn.attachments && turn.attachments.length > 0 && (
              <span className="badge badge-sm badge-ghost flex-shrink-0 gap-1">
                📎 {turn.attachments.length}
              </span>
            )}
            {isLast && isProcessing && (
              <span className="loading loading-double-ring loading-xs text-primary flex-shrink-0"></span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 编辑按钮 - 铅笔图标 + "编辑" 文字 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              disabled={isProcessing}
              className="btn btn-ghost btn-xs flex items-center gap-1 opacity-60 hover:opacity-100 text-primary font-medium"
              title="编辑此提问"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              <span>编辑</span>
            </button>
            {/* 重新提交按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('确定要重新提交此轮对话吗？')) {
                  onEditTurn(turn.promptMessageIndex, turn.prompt, turn.attachments);
                }
              }}
              disabled={isProcessing}
              className="btn btn-ghost btn-xs flex items-center gap-1 opacity-60 hover:opacity-100 text-secondary font-medium"
              title="重新提交此提问"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M16 3h5v5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M8 21H3v-5"/>
              </svg>
              <span>重新提交</span>
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={isProcessing}
              className="btn btn-ghost btn-xs btn-circle opacity-30 hover:opacity-100 text-error"
              title="删除本轮对话"
            >
              ✕
            </button>
            <span className="text-base-content/50 text-xs font-bold">
              {isOpen ? '收起 ↑' : '答 ↓'}
            </span>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="p-3 bg-base-100 bg-opacity-30 space-y-2 border-t border-base-content border-opacity-5">
          {turn.attachments && turn.attachments.length > 0 && (
            <div className="border-b border-base-content border-opacity-5 pb-2">
              <AttachmentPreview attachments={turn.attachments} compact />
            </div>
          )}
          {turn.messages.length === 0 && !isProcessing && (
            <p className="text-base-content/50 text-xs italic">无回答内容</p>
          )}

          {turnGroupedItems.map((item, idx) => {
            if (item.type === 'tool_group' && item.groupMessages) {
              const mappedGroup = item.groupMessages.map(gm => {
                const originalIndex = turn.messages[gm.originalIndex!].originalIndex;
                return {
                  message: gm.message,
                  originalIndex: originalIndex
                };
              });

              return (
                <ToolGroup
                  key={`turn-tool-group-${idx}`}
                  groupMessages={mappedGroup}
                  isProcessing={isProcessing && isLast}
                  onDeleteMessage={onDeleteMessage}
                />
              );
            }

            const relativeIndex = item.originalIndex!;
            const originalIndex = turn.messages[relativeIndex].originalIndex;
            const msg = turn.messages[relativeIndex].message;

            return (
              <div key={`msg-${originalIndex}`} className="flex items-start justify-between gap-2 relative">
                <div className="flex-grow min-w-0">
                  {msg.type === 'system' ? (
                    <CollapsibleWrapper content={msg.content} bgClass="from-base-200">
                      <div className="bg-base-200 px-3 py-1 rounded text-base-content/60 text-sm">
                        {msg.content}
                      </div>
                    </CollapsibleWrapper>
                  ) : msg.type === 'screenshot' && msg.imageData ? (
                    <ScreenshotMessage imageData={msg.imageData} mediaType={msg.mediaType} />
                  ) : (
                    <CollapsibleWrapper content={msg.content} bgClass="from-base-100" defaultExpanded={!isProcessing || !isLast}>
                      <LlmContent content={msg.content} />
                    </CollapsibleWrapper>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteMessage(originalIndex);
                  }}
                  className="btn btn-ghost btn-xs btn-circle opacity-25 hover:opacity-100 transition-opacity text-error flex-shrink-0 self-center"
                  title="Delete this message"
                >
                  ✕
                </button>
              </div>
            );
          })}
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
  onDeleteTurn,
  onEditTurn,
  isProcessing
}) => {
  if (messages.length === 0 && Object.keys(streamingSegments).length === 0) {
    return <p className="text-base-content/60">No output yet</p>;
  }

  const segmentedItems = segmentConversations(messages);

  return (
    <div>
      {segmentedItems.map((item, index) => {
        if (item.type === 'turn' && item.turn) {
          const isLast = index === segmentedItems.length - 1;
          return (
            <ConversationTurnComponent
              key={`turn-${index}`}
              turn={item.turn}
              isLast={isLast}
              isProcessing={isProcessing}
              onDeleteTurn={onDeleteTurn}
              onDeleteMessage={onDeleteMessage}
              onEditTurn={onEditTurn}
            />
          );
        }

        const msg = item.message!;
        const originalIndex = item.originalIndex!;

        return (
          <div key={`msg-${originalIndex}`} className="mb-2 flex items-start justify-between gap-2 relative">
            <div className="flex-grow min-w-0">
              {msg.type === 'system' ? (
                <div className="bg-base-200 px-3 py-1 rounded text-base-content/60 text-sm">
                  {msg.content}
                </div>
              ) : msg.type === 'screenshot' && msg.imageData ? (
                <ScreenshotMessage imageData={msg.imageData} mediaType={msg.mediaType} />
              ) : (
                <LlmContent content={msg.content} />
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteMessage(originalIndex);
              }}
              className="btn btn-ghost btn-xs btn-circle opacity-25 hover:opacity-100 transition-opacity text-error flex-shrink-0 self-center"
              title="Delete this message"
            >
              ✕
            </button>
          </div>
        );
      })}
      
      {isStreaming && Object.entries(streamingSegments).map(([id, content]) => (
        <div key={`segment-${id}`} className="mb-2 animate-pulse pr-8">
          <LlmContent content={content} />
        </div>
      ))}
    </div>
  );
};
