import { faPaperPlane, faXmark, faPlus, faPaperclip, faFilePdf, faFileLines, faImage } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { FileAttachment } from '../../background/types';
import {
  processFiles,
  getFilesFromDataTransfer,
  getFilesFromClipboard,
  getAcceptedFileTypes,
  formatFileSize,
  checkAttachmentLimits,
} from '../utils/fileUtils';

interface PromptFormProps {
  onSubmit: (prompt: string, attachments?: FileAttachment[]) => void;
  onCancel: () => void;
  isProcessing: boolean;
  tabStatus: 'attached' | 'detached' | 'unknown' | 'running' | 'idle' | 'error';
  attachments: FileAttachment[];
  onAttachmentsChange: (attachments: FileAttachment[]) => void;
}

interface Skill {
  id: string;
  name: string;
  prompt: string;
}

export const PromptForm: React.FC<PromptFormProps> = ({
  onSubmit,
  onCancel,
  isProcessing,
  tabStatus,
  attachments,
  onAttachmentsChange,
}) => {
  const [prompt, setPrompt] = useState('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillPrompt, setNewSkillPrompt] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chrome.storage.local.get({ userSkills: [] }, (result) => {
      let list = result.userSkills || [];
      if (list.length === 0) {
        const defaultSkill: Skill = {
          id: 'default-play-video',
          name: '🎬 自动视频播放',
          prompt: '播放未完成视频，弹出播放页面，焦点转移到新播放页面，点击播放按钮。播放完毕，回到网络学院。刷新页面，点击未完成视频，焦点到播放页面，点击播放，等待播放视频完毕（获得时间戳或者捕获页面），再回到网络学院，开始新一轮播放。'
        };
        list = [defaultSkill];
        chrome.storage.local.set({ userSkills: list });
      }
      setSkills(list);
    });
  }, []);

  const handleSaveSkill = () => {
    if (!newSkillName.trim() || !newSkillPrompt.trim()) return;
    const newSkill: Skill = {
      id: `skill-${Date.now()}`,
      name: newSkillName.trim(),
      prompt: newSkillPrompt.trim()
    };
    const updated = [...skills, newSkill];
    setSkills(updated);
    chrome.storage.local.set({ userSkills: updated });
    
    setNewSkillName('');
    setNewSkillPrompt('');
    setShowAddForm(false);
  };

  const handleDeleteSkill = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确认删除这个快捷指令吗？')) {
      const updated = skills.filter(s => s.id !== id);
      setSkills(updated);
      chrome.storage.local.set({ userSkills: updated });
    }
  };

  const handleAddFiles = useCallback(async (files: File[]) => {
    const limitCheck = checkAttachmentLimits(attachments, files);
    if (!limitCheck.ok) {
      alert(limitCheck.message);
      return;
    }
    const newAttachments = await processFiles(files);
    onAttachmentsChange([...attachments, ...newAttachments]);
  }, [attachments, onAttachmentsChange]);

  const handleRemoveAttachment = useCallback((id: string) => {
    onAttachmentsChange(attachments.filter(a => a.id !== id));
  }, [attachments, onAttachmentsChange]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleAddFiles(files);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const files = getFilesFromClipboard(e.clipboardData);
    if (files.length > 0) {
      e.preventDefault();
      handleAddFiles(files);
    }
  }, [handleAddFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = getFilesFromDataTransfer(e.dataTransfer);
    if (files.length > 0) {
      handleAddFiles(files);
    }
  }, [handleAddFiles]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!prompt.trim() && attachments.length === 0) || isProcessing || tabStatus === 'detached') return;
    onSubmit(prompt, attachments.length > 0 ? attachments : undefined);
    setPrompt('');
  };

  const canSubmit = (prompt.trim() || attachments.length > 0) && !isProcessing && tabStatus !== 'detached';

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'image': return faImage;
      case 'pdf': return faFilePdf;
      default: return faFileLines;
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 relative"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-10 border-2 border-dashed border-primary rounded-lg bg-primary bg-opacity-10 flex items-center justify-center pointer-events-none">
          <span className="text-primary font-semibold text-sm">释放文件以上传</span>
        </div>
      )}

      {/* Shortcut Skills Panel */}
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-gray-500 font-semibold select-none">快捷指令:</span>
          {skills.map(skill => (
            <div 
              key={skill.id}
              onClick={() => setPrompt(skill.prompt)}
              className="badge badge-outline badge-primary hover:bg-primary hover:text-primary-content cursor-pointer py-2.5 px-2 flex items-center gap-1 max-w-[150px] truncate"
              title={skill.prompt}
            >
              <span className="truncate">{skill.name}</span>
              <span 
                onClick={(e) => handleDeleteSkill(e, skill.id)}
                className="hover:text-red-500 font-bold ml-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-base-300 transition-colors"
                title="删除此指令"
              >
                ✕
              </span>
            </div>
          ))}
          <button 
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-ghost btn-xs btn-circle text-primary"
            title="添加新指令"
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>

        {/* Add Skill Panel Card */}
        {showAddForm && (
          <div className="mt-2 p-3 border border-base-content border-opacity-10 rounded-lg bg-base-100 shadow-sm space-y-2">
            <h4 className="font-semibold text-xs text-base-content">新建快捷指令</h4>
            <input 
              type="text" 
              placeholder="指令名称 (例如: 🎬 播放视频)" 
              value={newSkillName}
              onChange={e => setNewSkillName(e.target.value)}
              className="input input-bordered input-xs w-full text-xs"
            />
            <textarea 
              placeholder="完整的长提示词内容..." 
              value={newSkillPrompt}
              onChange={e => setNewSkillPrompt(e.target.value)}
              className="textarea textarea-bordered textarea-xs w-full text-xs h-20 resize-none"
            />
            <div className="flex justify-end gap-1.5">
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="btn btn-ghost btn-xs"
              >
                取消
              </button>
              <button 
                type="button" 
                onClick={handleSaveSkill}
                className="btn btn-primary btn-xs"
                disabled={!newSkillName.trim() || !newSkillPrompt.trim()}
              >
                保存
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attachment preview area */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map(att => (
            <div
              key={att.id}
              className="relative group flex items-center gap-1.5 bg-base-200 rounded-lg px-2 py-1.5 text-xs max-w-[200px]"
            >
              {att.type === 'image' && att.thumbnail ? (
                <img
                  src={`data:image/jpeg;base64,${att.thumbnail}`}
                  alt={att.name}
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                />
              ) : (
                <FontAwesomeIcon
                  icon={getAttachmentIcon(att.type)}
                  className="text-base-content opacity-60 flex-shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-base-content">{att.name}</div>
                <div className="text-base-content opacity-50">{formatFileSize(att.size)}</div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(att.id)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-error text-error-content rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                title="移除附件"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={getAcceptedFileTypes()}
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="w-full relative">
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-sm btn-ghost btn-square mb-0.5 flex-shrink-0"
            disabled={isProcessing || tabStatus === 'detached'}
            title="添加附件（图片、PDF、文本文件）"
          >
            <FontAwesomeIcon icon={faPaperclip} />
          </button>
          <TextareaAutosize
            className="textarea textarea-bordered w-full pr-12 text-sm"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            onPaste={handlePaste}
            placeholder={tabStatus === 'detached' 
              ? "Tab connection lost. Please refresh the tab to continue." 
              : "输入消息... (可粘贴图片、拖拽文件)"}
            autoFocus
            disabled={isProcessing || tabStatus === 'detached'}
            minRows={1}
            maxRows={10}
            style={{ 
              resize: 'none',
              minHeight: '40px',
              maxHeight: '300px',
              overflow: 'auto'
            } as any}
          />
        </div>
        {isProcessing ? (
          <button 
            type="button" 
            onClick={onCancel}
            className="btn btn-sm btn-circle btn-error absolute"
            style={{ bottom: '5px', right: '5px' }}
            title="Cancel"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        ) : (
          <button 
            type="submit" 
            className="btn btn-sm btn-circle btn-primary absolute"
            style={{ bottom: '5px', right: '5px' }}
            disabled={!canSubmit}
            title={tabStatus === 'detached' ? "Refresh tab to continue" : "Execute"}
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        )}
      </div>
    </form>
  );
};
