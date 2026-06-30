import { faPaperPlane, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useMemo, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { PromptTemplateService } from '../../tracking/promptTemplateService';
import {
  extractVariables,
  fillTemplate,
  PromptTemplate,
  STORAGE_KEY,
} from '../../types/promptTemplate';
import { UserSkill } from '../../types/skill';

interface PromptFormProps {
  onSubmit: (prompt: string) => void;
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
    onSubmit(prompt);
    setPrompt(''); // Clear the prompt after submission
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

  return (
    <div className="mt-4 flex flex-col gap-2">
      {/* ── Template & Skill quick-access bar ── */}
      <div className="flex flex-wrap items-center gap-1 text-xs">
        <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} font-medium select-none mr-0.5`}>常用技能:</span>
        <div className="flex flex-wrap gap-1 items-center max-w-full">
          {skills.map(skill => (
            <div key={skill.id} className="relative group">
              <button
                type="button"
                onClick={() => handleApplySkill(skill.prompt)}
                disabled={isProcessing || tabStatus === 'detached'}
                className={`btn btn-[10px] h-6 min-h-[24px] ${theme === 'dark' ? 'glass-btn' : 'glass-btn-light'} rounded-full px-2.5 py-0 font-medium lowercase select-none`}
                title={skill.prompt}
              >
                {skill.name}
              </button>

              {/* 删除自定义技能按钮 (Hover 时显示) */}
              {!skill.id.startsWith('default_') && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteSkill(e, skill.id)}
                  className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-3.5 h-3.5 rounded-full bg-rose-500 text-white font-bold text-[8px] cursor-pointer"
                  title="删除技能"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Show template picker button */}
        <button
          type="button"
          onClick={() => setShowTemplatePicker(!showTemplatePicker)}
          className={`btn btn-xs btn-ghost ${theme === 'dark' ? 'text-amber-400 hover:bg-white/5' : 'text-amber-600 hover:bg-black/5'} font-bold min-h-[24px] h-6 px-1.5 ${showTemplatePicker ? 'opacity-70' : ''}`}
          title="从提示词模板库选择"
        >
          📋 模板
        </button>

        {/* 如果当前输入框有内容，且未处于保存面板状态，显示“⭐ 存为技能”按钮 */}
        {prompt.trim() && !isSaving && (
          <button
            type="button"
            onClick={() => setIsSaving(true)}
            className={`btn btn-xs btn-ghost ${theme === 'dark' ? 'text-indigo-400 hover:bg-white/5' : 'text-indigo-600 hover:bg-black/5'} font-bold ml-auto min-h-[24px] h-6 px-1.5`}
            title="将输入框的指令保存为常用技能"
          >
            ⭐ 存为技能
          </button>
        )}
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

      {/* 新建技能面板 */}
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

      {/* 原指令输入表单 */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="w-full">
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
