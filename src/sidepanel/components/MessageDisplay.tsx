import React, { useState, useEffect } from 'react';
import { Message } from '../types';
import { FileAttachment } from '../../background/types';
import { LlmContent } from './LlmContent';
import { ScreenshotMessage } from './ScreenshotMessage';
import { AttachmentPreview } from './AttachmentPreview';

/**
 * "Connected to tab: ..." 只是连接事件日志，不是对话内容。
 * 当前连接的标签页已经在顶栏（TabStatusBar）用状态点 + 标题呈现，
 * 这里直接不渲染，避免每次都往消息流里堆一整条提示、挤占工作区高度。
 */
const isConnectionNotice = (m: Message): boolean =>
  m.type === 'system' && m.content.startsWith('Connected to tab:');

/**
 * 系统日志行（如 "Switched to tab: ... (https://...)"）。
 * 不再用整块底色盒子，改成"左侧细色条 + 无底色"，降低视觉重量；
 * 同时 break-all + line-clamp-2，避免一条长 URL 把行高撑到十几行。
 */
const SystemLine: React.FC<{ content: string }> = ({ content }) => (
  <div
    className="border-l-2 border-base-content/15 pl-2 py-0.5 text-xs text-base-content/60 break-all line-clamp-2"
    title={content}
  >
    {content}
  </div>
);

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
          className="text-xs font-medium text-primary/80 hover:text-primary hover:underline transition-colors"
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
  // 默认折叠：只显示"共 N 步"，需要时手动展开，避免占用工作区高度
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-t border-base-content/10 my-1 pt-0.5">
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center justify-between py-1 cursor-pointer text-[11px] font-medium text-base-content/55 hover:text-base-content/80 select-none"
      >
        <div className="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 6h13"></path>
            <path d="M8 12h13"></path>
            <path d="M8 18h13"></path>
            <path d="M3 6h.01"></path>
            <path d="M3 12h.01"></path>
            <path d="M3 18h.01"></path>
          </svg>
          <span>自动操作步骤 · {groupMessages.length} 步</span>
          {isProcessing && <span className="loading loading-double-ring loading-xs text-primary ml-1"></span>}
        </div>
        <span className="text-base-content/40">
          {isOpen ? '收起 ↑' : '展开 ↓'}
        </span>
      </div>

      {isOpen && (
        <div className="space-y-0.5 pb-1 max-h-[300px] overflow-y-auto">
          {groupMessages.map(({ message, originalIndex }) => (
            <div key={`group-msg-${originalIndex}`} className="group flex items-start justify-between gap-2 relative">
              <div className="flex-grow min-w-0 pl-2 border-l border-base-content/10 text-[11px] leading-relaxed text-base-content/55 font-mono whitespace-pre-wrap break-all">
                {message.content}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMessage(originalIndex);
                }}
                className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-error flex-shrink-0 self-center"
                title="删除此步骤"
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
    <div className="border border-base-content/[0.08] rounded-lg overflow-hidden my-2.5 bg-base-100">
      {isEditing ? (
        <div 
          className="p-3 bg-base-200 border-b border-base-content border-opacity-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-semibold text-base-content/60 mb-1.5 flex items-center gap-1">
            <span className="inline-flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              编辑提问:
            </span>
          </div>
          <textarea
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            className="w-full text-sm p-2 rounded border border-base-300 focus:outline-none focus:border-primary bg-base-100 text-base-content"
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
          className="flex items-center justify-between px-2.5 py-2 cursor-pointer bg-base-200/70 hover:bg-base-200 text-sm font-medium text-base-content select-none"
        >
          <div className="flex items-center gap-2 flex-grow min-w-0 pr-2">
            <span className="text-primary font-bold flex-shrink-0">问:</span>
            <span className="truncate flex-grow text-base-content font-medium" title={turn.prompt}>{turn.prompt}</span>
            {turn.attachments && turn.attachments.length > 0 && (
              <span className="badge badge-sm badge-ghost flex-shrink-0 gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
                {turn.attachments.length}
              </span>
            )}
            {isLast && isProcessing && (
              <span className="loading loading-double-ring loading-xs text-primary flex-shrink-0"></span>
            )}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* 编辑按钮（图标 + 悬停提示；窄面板里不再放文字，给提问留空间） */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              disabled={isProcessing}
              className="btn btn-ghost btn-xs btn-circle opacity-50 hover:opacity-100 text-primary"
              title="编辑此提问"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
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
              className="btn btn-ghost btn-xs btn-circle opacity-50 hover:opacity-100 text-secondary"
              title="重新提交此提问"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M16 3h5v5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M8 21H3v-5"/>
              </svg>
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={isProcessing}
              className="btn btn-ghost btn-xs btn-circle opacity-50 hover:opacity-100 text-error"
              title="删除本轮对话"
            >
              ✕
            </button>
            <span className="text-base-content/50 text-[11px] font-medium ml-0.5">
              {isOpen ? '收起 ↑' : '答 ↓'}
            </span>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="p-2.5 space-y-1.5 border-t border-base-content/[0.06]">
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

            // 连接事件提示不再渲染（见 isConnectionNotice）
            if (isConnectionNotice(msg)) return null;

            return (
              <div key={`msg-${originalIndex}`} className="group flex items-start justify-between gap-2 relative">
                <div className="flex-grow min-w-0">
                  {msg.type === 'system' ? (
                    <CollapsibleWrapper content={msg.content} bgClass="from-base-100">
                      <SystemLine content={msg.content} />
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
                  className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-error flex-shrink-0 self-center"
                  title="删除此消息"
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

        // 连接事件提示不再渲染（见 isConnectionNotice）
        if (isConnectionNotice(msg)) return null;

        return (
          <div key={`msg-${originalIndex}`} className="group mb-1.5 flex items-start justify-between gap-2 relative">
            <div className="flex-grow min-w-0">
              {msg.type === 'system' ? (
                <SystemLine content={msg.content} />
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
              className="btn btn-ghost btn-xs btn-circle opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-error flex-shrink-0 self-center"
              title="删除此消息"
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
