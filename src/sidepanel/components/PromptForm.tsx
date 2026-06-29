import { faPaperPlane, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { UserSkill } from '../../types/skill';

interface PromptFormProps {
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
  tabStatus: 'attached' | 'detached' | 'unknown' | 'running' | 'idle' | 'error';
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
  tabStatus
}) => {
  const [prompt, setPrompt] = useState('');
  const [skills, setSkills] = useState<UserSkill[]>(DEFAULT_SKILLS);
  const [isSaving, setIsSaving] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing || tabStatus === 'detached') return;
    onSubmit(prompt);
    setPrompt(''); // Clear the prompt after submission
  };

  const handleApplySkill = (skillPrompt: string) => {
    setPrompt(skillPrompt);
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
      {/* 常用技能快捷栏 */}
      <div className="flex flex-wrap items-center gap-1 text-xs">
        <span className="text-gray-400 font-medium select-none mr-0.5">常用技能:</span>
        <div className="flex flex-wrap gap-1 items-center max-w-full">
          {skills.map(skill => (
            <div key={skill.id} className="relative group">
              <button
                type="button"
                onClick={() => handleApplySkill(skill.prompt)}
                disabled={isProcessing || tabStatus === 'detached'}
                className="btn btn-[10px] h-6 min-h-[24px] btn-outline btn-neutral rounded-full px-2 py-0 font-medium lowercase select-none"
                title={skill.prompt}
              >
                {skill.name}
              </button>
              
              {/* 删除自定义技能按钮 (Hover 时显示) */}
              {!skill.id.startsWith('default_') && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteSkill(e, skill.id)}
                  className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-3.5 h-3.5 rounded-full bg-error text-white font-bold text-[8px] cursor-pointer"
                  title="删除技能"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* 如果当前输入框有内容，且未处于保存面板状态，显示“⭐ 存为技能”按钮 */}
        {prompt.trim() && !isSaving && (
          <button
            type="button"
            onClick={() => setIsSaving(true)}
            className="btn btn-xs btn-ghost text-primary font-bold ml-auto min-h-[24px] h-6 px-1.5"
            title="将输入框的指令保存为常用技能"
          >
            ⭐ 存为技能
          </button>
        )}
      </div>

      {/* 新建技能面板 */}
      {isSaving && (
        <div className="flex items-center gap-1.5 p-1.5 bg-base-300 rounded-md text-xs animate-fade-in">
          <span className="font-semibold text-gray-500 flex-shrink-0">技能名称:</span>
          <input
            type="text"
            placeholder="如: 翻译成日文"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            className="input input-xs input-bordered flex-grow text-xs h-6"
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
            className="btn btn-xs btn-primary h-6 min-h-[24px] px-2"
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
            className="btn btn-xs btn-ghost h-6 min-h-[24px] px-2"
          >
            取消
          </button>
        </div>
      )}

      {/* 原指令输入表单 */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="w-full">
          <TextareaAutosize
            className="textarea textarea-bordered w-full pr-12"
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
              overflow: 'auto'
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
              className="btn btn-sm btn-circle btn-primary absolute"
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
