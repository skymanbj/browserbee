import { faPaperPlane, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { FileAttachment } from '../../background/types';
import { PromptTemplateService } from '../../tracking/promptTemplateService';
import {
  extractVariables,
  fillTemplate,
  PromptTemplate,
  STORAGE_KEY,
} from '../../types/promptTemplate';
import { UserSkill } from '../../types/skill';
import {
  checkAttachmentLimits,
  getAcceptedFileTypes,
  processFiles
} from '../utils/fileUtils';
import { AttachmentPreview } from './AttachmentPreview';

interface PromptFormProps {
  onSubmit: (prompt: string, attachments?: FileAttachment[]) => void;
  onCancel: () => void;
  isProcessing: boolean;
  tabStatus: 'attached' | 'detached' | 'unknown' | 'running' | 'idle' | 'error';
  theme?: 'dark' | 'light';
}

const DEFAULT_SKILLS: UserSkill[] = [
  {
    id: 'default_summary',
    name: '📝 页面总结',
    prompt: '总结当前页面的主要内容，列出核心要点。',
    createdAt: 0
  },
  {
    id: 'default_table',
    name: '📊 提取表格',
    prompt: '将当前页面上的关键数据整理并以表格的形式呈现。',
    createdAt: 0
  },
  {
    id: 'default_screenshot',
    name: '📸 屏幕截图',
    prompt: '对当前页面截图，并简要分析页面上的布局和内容。',
    createdAt: 0
  }
];

// 提取开头的 Emoji 字符，或者在没有 Emoji 时提取名字的前2个字符作为缩写
const getSkillEmojiOrShortName = (name: string): string => {
  const emojiRegex = /^([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]+)/u;
  const match = name.match(emojiRegex);
  if (match) {
    return match[1];
  }
  return name.slice(0, 2);
};

export const PromptForm: React.FC<PromptFormProps> = ({
  onSubmit,
  onCancel,
  isProcessing,
  tabStatus,
  theme = 'dark'
}) => {
  const [prompt, setPrompt] = useState('');
  const [skills, setSkills] = useState<UserSkill[]>(DEFAULT_SKILLS);
  const [isSaving, setIsSaving] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);
  const [createSkillName, setCreateSkillName] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ── Prompt templates state ──
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  // Variable substitution state
  const [pendingTemplate, setPendingTemplate] = useState<PromptTemplate | null>(null);
  const [pendingVars, setPendingVars] = useState<string[]>([]);
  const [varValues, setVarValues] = useState<Record<string, string>>({});

  // Load user custom skills from local storage
  useEffect(() => {
    const loadSkills = () => {
      chrome.storage.local.get('browserbee_user_skills', (result) => {
        const userSkills = (result['browserbee_user_skills'] || []) as UserSkill[];
        setSkills([...DEFAULT_SKILLS, ...userSkills]);
      });
    };

    loadSkills();

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes['browserbee_user_skills']) {
        loadSkills();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // Load prompt templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const service = PromptTemplateService.getInstance();
        const all = await service.getAll();
        setTemplates(all);
      } catch {
        // Silently fail – templates are optional
      }
    };
    loadTemplates();

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes[STORAGE_KEY]) {
        loadTemplates();
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return templates;
    const q = templateSearch.toLowerCase().trim();
    return templates.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.prompt.toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
    );
  }, [templates, templateSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing || tabStatus === 'detached') return;
    onSubmit(prompt, attachments.length > 0 ? attachments : undefined);
    setPrompt('');
    setAttachments([]);
  };

  const handleApplySkill = (skillPrompt: string) => {
    setPrompt(skillPrompt);
  };

  // ── Template application ──

  /** Initiate applying a template – checks for variables first */
  const handleApplyTemplate = (template: PromptTemplate) => {
    const vars = extractVariables(template.prompt);
    if (vars.length > 0) {
      // Show variable substitution dialog
      setPendingTemplate(template);
      setPendingVars(vars);
      const initial: Record<string, string> = {};
      vars.forEach(v => { initial[v] = ''; });
      setVarValues(initial);
    } else {
      // No variables, apply directly
      setPrompt(template.prompt);
      setShowTemplatePicker(false);
      setTemplateSearch('');
    }
  };

  /** Confirm variable values and fill template */
  const confirmVarFill = () => {
    if (!pendingTemplate) return;
    const filled = fillTemplate(pendingTemplate.prompt, varValues);
    setPrompt(filled);
    setPendingTemplate(null);
    setPendingVars([]);
    setVarValues({});
    setShowTemplatePicker(false);
    setTemplateSearch('');
  };

  /** Cancel variable filling */
  const cancelVarFill = () => {
    setPendingTemplate(null);
    setPendingVars([]);
    setVarValues({});
  };

  const handleSaveSkill = () => {
    if (!newSkillName.trim() || !prompt.trim()) return;

    const newSkill: UserSkill = {
      id: 'skill_' + Date.now(),
      name: newSkillName.trim(),
      prompt: prompt.trim(),
      createdAt: Date.now()
    };

    chrome.storage.local.get('browserbee_user_skills', (result) => {
      const userSkills = (result['browserbee_user_skills'] || []) as UserSkill[];
      userSkills.push(newSkill);
      chrome.storage.local.set({ 'browserbee_user_skills': userSkills }, () => {
        setIsSaving(false);
        setNewSkillName('');
      });
    });
  };

  const handleDeleteSkill = (e: React.MouseEvent, skillId: string) => {
    e.stopPropagation(); // Prevent applying the skill when clicking delete
    chrome.storage.local.get('browserbee_user_skills', (result) => {
      let userSkills = (result['browserbee_user_skills'] || []) as UserSkill[];
      userSkills = userSkills.filter(s => s.id !== skillId);
      chrome.storage.local.set({ 'browserbee_user_skills': userSkills });
    });
  };

  // ── File attachment handling ──
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const check = checkAttachmentLimits(attachments, fileArray);
    if (!check.ok) {
      alert(check.message);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const processed = await processFiles(fileArray);
      setAttachments(prev => [...prev, ...processed]);
    } catch (err) {
      console.error('Failed to process files:', err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  // ── Create new skill directly ──
  const handleCreateSkillFromEmpty = () => {
    if (!createSkillName.trim()) return;
    const newSkill: UserSkill = {
      id: 'skill_' + Date.now(),
      name: createSkillName.trim(),
      prompt: prompt.trim() || '新建技能指令...',
      createdAt: Date.now()
    };
    chrome.storage.local.get('browserbee_user_skills', (result) => {
      const userSkills = (result['browserbee_user_skills'] || []) as UserSkill[];
      userSkills.push(newSkill);
      chrome.storage.local.set({ 'browserbee_user_skills': userSkills }, () => {
        setIsCreatingSkill(false);
        setCreateSkillName('');
      });
    });
  };

  return (
    <div className="mt-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-1 text-[11px] w-full py-0.5 select-none overflow-visible">
        {/* 常用技能与可滑动技能按钮列表 */}
        <div className="flex items-center gap-1 overflow-x-auto flex-grow [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1">
          <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} font-medium select-none mr-0.5 shrink-0`}>常用技能:</span>
          {skills.map(skill => (
            <div key={skill.id} className="relative group shrink-0">
              <button
                type="button"
                onClick={() => handleApplySkill(skill.prompt)}
                disabled={isProcessing || tabStatus === 'detached'}
                className={`text-xs h-[20px] px-2.5 flex items-center justify-center ${theme === 'dark' ? 'bg-white/10 hover:bg-white/15 text-gray-200 border border-white/5' : 'bg-black/5 hover:bg-black/10 text-gray-700 border border-black/5'} rounded-full font-medium select-none transition-colors`}
                title={`${skill.name}: ${skill.prompt}`}
              >
                {getSkillEmojiOrShortName(skill.name)}
              </button>

              {/* 删除自定义技能按钮 - 简洁下划线样式，Hover 时显示 */}
              {!skill.id.startsWith('default_') && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteSkill(e, skill.id)}
                  className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full border transition-all duration-150 opacity-0 group-hover:opacity-100 hover:scale-110 cursor-pointer ${theme === 'dark' ? 'border-rose-400/60 text-rose-400 hover:bg-rose-500/20' : 'border-rose-400/80 text-rose-500 hover:bg-rose-50'}`}
                  title="删除技能"
                  style={{ fontSize: '10px', lineHeight: '1' }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 右侧固定操作区 —— 取消文字，只保留emoji，减少空间占用 */}
        <div className="flex items-center gap-1 shrink-0 ml-auto pl-1">
          {/* Show template picker button */}
          <button
            type="button"
            onClick={() => setShowTemplatePicker(!showTemplatePicker)}
            className={`text-xs h-[20px] w-6 flex items-center justify-center rounded ${theme === 'dark' ? 'text-amber-400 hover:bg-white/5' : 'text-amber-600 hover:bg-black/5'} ${showTemplatePicker ? 'opacity-70' : ''}`}
            title="提示词模板库"
          >
            📋
          </button>

          {/* 新建技能按钮（始终显示） */}
          <button
            type="button"
            onClick={() => setIsCreatingSkill(true)}
            className={`text-xs h-[20px] w-6 flex items-center justify-center rounded ${theme === 'dark' ? 'text-emerald-400 hover:bg-white/5' : 'text-emerald-600 hover:bg-black/5'}`}
            title="新建常用技能"
          >
            ✨
          </button>

          {/* 如果当前输入框有内容，且未处于保存面板状态，显示"⭐ 存为技能"按钮 */}
          {prompt.trim() && !isSaving && (
            <button
              type="button"
              onClick={() => setIsSaving(true)}
              className={`text-xs h-[20px] w-6 flex items-center justify-center rounded ${theme === 'dark' ? 'text-indigo-400 hover:bg-white/5' : 'text-indigo-600 hover:bg-black/5'}`}
              title="将输入指令保存为技能"
            >
              ⭐
            </button>
          )}
        </div>
      </div>

      {/* ── Prompt Template Picker Panel ── */}
      {showTemplatePicker && (
        <div className={`p-2 ${theme === 'dark' ? 'bg-amber-950/30 border border-white/5' : 'bg-amber-50/70 border border-amber-200/50'} rounded-md text-xs animate-fade-in max-h-64 overflow-hidden flex flex-col`}>
          {/* Search input */}
          <div className="flex items-center gap-1 mb-1.5">
            <span className={`font-semibold ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'} flex-shrink-0`}>📋 模板库</span>
            <input
              type="text"
              placeholder="搜索模板..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className={`input input-xs ${theme === 'dark' ? 'glass-input' : 'glass-input-light'} flex-grow text-xs h-6`}
              autoFocus
            />
            <button
              type="button"
              onClick={() => { setShowTemplatePicker(false); setTemplateSearch(''); }}
              className="btn btn-xs btn-ghost h-6 min-h-[24px] px-1"
            >
              ✕
            </button>
          </div>

          {/* Template list */}
          <div className="flex-1 overflow-y-auto space-y-0.5 scrollbar-thin">
            {filteredTemplates.length === 0 ? (
              <p className={`text-center py-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                {templates.length === 0 ? '暂无模板，请先在设置页面添加' : '无匹配模板'}
              </p>
            ) : (
              filteredTemplates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleApplyTemplate(t)}
                  className={`w-full text-left px-2 py-1 rounded ${theme === 'dark' ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-black/5 text-gray-700'} transition-colors flex items-center gap-2`}
                  title={t.prompt}
                >
                  <span className="flex-shrink-0">{t.name}</span>
                  {t.category && (
                    <span className={`badge badge-xs ${theme === 'dark' ? 'badge-outline' : 'badge-ghost'}`}>{t.category}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Variable Substitution Dialog ── */}
      {pendingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className={`p-4 rounded-lg shadow-xl max-w-md w-full mx-2 ${theme === 'dark' ? 'bg-gray-800 border border-white/10' : 'bg-white border border-gray-200'}`}>
            <h3 className={`text-sm font-bold mb-3 flex items-center gap-1.5 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>
              📋 填写模板变量
              <span className={`text-xs font-normal ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                — {pendingTemplate.name}
              </span>
            </h3>

            <div className="space-y-2">
              {pendingVars.map(v => (
                <div key={v} className="flex flex-col gap-0.5">
                  <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {'{{'}{v}{'}}'}
                  </label>
                  <input
                    type="text"
                    className={`input input-sm ${theme === 'dark' ? 'glass-input' : 'glass-input-light'} w-full text-xs`}
                    placeholder={`输入 ${v} 的值...`}
                    value={varValues[v] || ''}
                    onChange={(e) => setVarValues(prev => ({ ...prev, [v]: e.target.value }))}
                    autoFocus={v === pendingVars[0]}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const idx = pendingVars.indexOf(v);
                        if (idx < pendingVars.length - 1) {
                          // Focus next input - handled by autoFocus on re-render
                          // but we'll just confirm to keep simple
                        } else {
                          confirmVarFill();
                        }
                      }
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className={`mt-2 p-1.5 rounded text-xs font-mono ${theme === 'dark' ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-500'} max-h-16 overflow-y-auto`}>
              {fillTemplate(pendingTemplate.prompt, varValues)}
            </div>

            <div className="flex items-center gap-2 mt-3 justify-end">
              <button
                type="button"
                onClick={cancelVarFill}
                className={`btn btn-xs ${theme === 'dark' ? 'glass-btn' : 'glass-btn-light'} h-7 min-h-[28px]`}
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmVarFill}
                className={`btn btn-xs ${theme === 'dark' ? 'glass-btn-primary' : 'glass-btn-primary-light'} h-7 min-h-[28px]`}
                disabled={pendingVars.some(v => !varValues[v]?.trim())}
              >
                应用模板
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 隐藏的文件输入 ── */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={getAcceptedFileTypes()}
        multiple
        className="hidden"
      />

      {/* ── 新建技能弹窗 ── */}
      {isCreatingSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className={`p-4 rounded-lg shadow-xl max-w-sm w-full mx-2 ${theme === 'dark' ? 'bg-gray-800 border border-white/10' : 'bg-white border border-gray-200'}`}>
            <h3 className={`text-sm font-bold mb-3 flex items-center gap-1.5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
              ✨ 新建常用技能
            </h3>
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  技能名称
                </label>
                <input
                  type="text"
                  placeholder="如: 翻译成日文"
                  value={createSkillName}
                  onChange={(e) => setCreateSkillName(e.target.value)}
                  className={`input input-sm ${theme === 'dark' ? 'glass-input' : 'glass-input-light'} w-full text-xs`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateSkillFromEmpty();
                    if (e.key === 'Escape') {
                      setIsCreatingSkill(false);
                      setCreateSkillName('');
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  指令内容
                </label>
                <textarea
                  placeholder="输入技能对应的指令..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className={`textarea textarea-sm ${theme === 'dark' ? 'glass-input' : 'glass-input-light'} w-full text-xs`}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 justify-end">
              <button
                type="button"
                onClick={() => { setIsCreatingSkill(false); setCreateSkillName(''); }}
                className={`btn btn-xs ${theme === 'dark' ? 'glass-btn' : 'glass-btn-light'} h-7 min-h-[28px]`}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateSkillFromEmpty}
                className={`btn btn-xs ${theme === 'dark' ? 'glass-btn-primary' : 'glass-btn-primary-light'} h-7 min-h-[28px]`}
                disabled={!createSkillName.trim()}
              >
                ✨ 创建技能
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 存为技能面板 */}
      {isSaving && (
        <div className={`flex items-center gap-1.5 p-1.5 ${theme === 'dark' ? 'bg-indigo-950/40 border border-white/5' : 'bg-slate-200/50 border border-black/5'} rounded-md text-xs animate-fade-in`}>
          <span className={`font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} flex-shrink-0`}>技能名称:</span>
          <input
            type="text"
            placeholder="如: 翻译成日文"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            className={`input input-xs ${theme === 'dark' ? 'glass-input' : 'glass-input-light'} flex-grow text-xs h-6`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveSkill();
              if (e.key === 'Escape') {
                setIsSaving(false);
                setNewSkillName('');
              }
            }}
          />
          <button
            type="button"
            onClick={handleSaveSkill}
            className={`btn btn-xs ${theme === 'dark' ? 'glass-btn-primary' : 'glass-btn-primary-light'} h-6 min-h-[24px] px-2`}
            disabled={!newSkillName.trim()}
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSaving(false);
              setNewSkillName('');
            }}
            className={`btn btn-xs ${theme === 'dark' ? 'glass-btn' : 'glass-btn-light'} h-6 min-h-[24px] px-2`}
          >
            取消
          </button>
        </div>
      )}

      {/* ── 附件预览区域（位于输入框上方） ── */}
      {attachments.length > 0 && (
        <div className="flex items-center gap-1.5 mb-1 px-1 overflow-x-auto">
          <AttachmentPreview
            attachments={attachments}
            removable={true}
            onRemove={handleRemoveAttachment}
          />
        </div>
      )}

      {/* 原指令输入表单 */}
      <form onSubmit={handleSubmit} className="flex items-end gap-1.5 w-full">
        {/* 添加文件按钮 —— 移到输入框同一行的最左侧 */}
        <button
          type="button"
          onClick={handleFileButtonClick}
          className={`btn btn-sm btn-ghost shrink-0 ${theme === 'dark' ? 'text-sky-400 hover:bg-white/5' : 'text-sky-600 hover:bg-black/5'} h-10 w-8 p-0 flex items-center justify-center text-lg leading-none`}
          style={{ minHeight: '40px' }}
          title="上传文件或图片"
        >
          📎
        </button>

        <div className="relative flex-grow">
          <TextareaAutosize
            className={`${theme === 'dark' ? 'glass-input' : 'glass-input-light'} textarea w-full pr-12`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={tabStatus === 'detached'
              ? "Tab connection lost. Please refresh the tab to continue."
              : "Type a message..."}
            autoFocus
            disabled={isProcessing || tabStatus === 'detached'}
            minRows={1}
            maxRows={10}
            style={{
              resize: 'none',
              minHeight: '40px',
              maxHeight: '300px',
              overflow: 'auto',
              border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0,0,0,0.08)'
            } as any}
          />
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
              className={`btn btn-sm btn-circle ${theme === 'dark' ? 'glass-btn-primary' : 'glass-btn-primary-light'} absolute`}
              style={{ bottom: '5px', right: '5px' }}
              disabled={!prompt.trim() || tabStatus === 'detached'}
              title={tabStatus === 'detached' ? "Refresh tab to continue" : "Execute"}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
