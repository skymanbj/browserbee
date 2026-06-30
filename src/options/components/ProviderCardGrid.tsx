import React from 'react';
import { OpenAICompatibleInstance } from '../../models/providers/openai-compatible';
import { useLanguage } from '../LanguageContext';

interface ProviderCardGridProps {
  provider: string;
  setProvider: (provider: string) => void;
  openaiCompatibleInstances: OpenAICompatibleInstance[];
}

export function ProviderCardGrid({
  provider,
  setProvider,
  openaiCompatibleInstances,
}: ProviderCardGridProps) {
  const { t, language } = useLanguage();

  const handleSelect = (value: string) => {
    setProvider(value);
  };

  const handleAddClick = () => {
    window.dispatchEvent(new CustomEvent('browserbee:addOpenAICompatible'));
  };

  // 内置提供商
  const builtInProviders = [
    {
      id: 'anthropic',
      name: 'Anthropic (Claude)',
      desc: language === 'zh' ? '性能优秀，推荐用于复杂任务' : 'Excellent performance, recommended for complex tasks',
      icon: '🔮',
    },
    {
      id: 'openai',
      name: 'OpenAI (GPT)',
      desc: language === 'zh' ? '主流之选，稳定可靠' : 'Popular choice, stable and reliable',
      icon: '🤖',
    },
    {
      id: 'gemini',
      name: 'Google (Gemini)',
      desc: language === 'zh' ? '性价比卓越，速度快' : 'Outstanding value, fast speed',
      icon: '✨',
    },
    {
      id: 'ollama',
      name: 'Ollama',
      desc: language === 'zh' ? '本地运行，完全免费与隐私保护' : 'Runs locally, completely free & private',
      icon: '🦙',
    },
  ];

  return (
    <div className="mb-6">
      <label className="label mb-2">
        <span className="label-text font-bold text-sm opacity-80">{t('Select Provider')}</span>
      </label>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 内置提供商卡片 */}
        {builtInProviders.map((item) => {
          const isActive = provider === item.id;
          return (
            <div
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`card bg-base-100 border cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 ${
                isActive
                  ? 'border-2 border-primary shadow-md ring-2 ring-primary/20 bg-primary/5'
                  : 'border-base-content/10'
              }`}
            >
              <div className="card-body p-4 relative">
                {isActive && (
                  <span className="absolute top-3 right-3 badge badge-primary badge-sm font-medium">
                    {language === 'zh' ? '当前使用' : 'Active'}
                  </span>
                )}
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl">{item.icon}</span>
                  <h3 className="font-bold text-base">{item.name}</h3>
                </div>
                <p className="text-xs text-base-content/60 leading-normal">{item.desc}</p>
              </div>
            </div>
          );
        })}

        {/* 自定义 OpenAI Compatible 实例卡片 */}
        {openaiCompatibleInstances.map((inst) => {
          const instValue = `openai-compatible:${inst.id}`;
          const isActive = provider === instValue;
          return (
            <div
              key={inst.id}
              onClick={() => handleSelect(instValue)}
              className={`card bg-base-100 border cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 ${
                isActive
                  ? 'border-2 border-primary shadow-md ring-2 ring-primary/20 bg-primary/5'
                  : 'border-base-content/10'
              }`}
            >
              <div className="card-body p-4 relative">
                {isActive && (
                  <span className="absolute top-3 right-3 badge badge-primary badge-sm font-medium">
                    {language === 'zh' ? '当前使用' : 'Active'}
                  </span>
                )}
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl">🔌</span>
                  <h3 className="font-bold text-base truncate pr-16">{inst.name}</h3>
                </div>
                <p className="text-xs text-base-content/60 leading-normal truncate">
                  {inst.baseUrl || 'OpenAI Compatible API'}
                </p>
              </div>
            </div>
          );
        })}

        {/* 添加自定义实例虚线卡片 */}
        <div
          onClick={handleAddClick}
          className="card border border-dashed border-base-content/30 cursor-pointer hover:border-primary hover:bg-base-200/50 hover:shadow-sm transition-all duration-200 flex items-center justify-center min-h-[100px] py-4"
        >
          <div className="text-center">
            <span className="text-xl mb-1 block">➕</span>
            <span className="font-medium text-sm text-primary">
              {language === 'zh' ? '添加自定义兼容服务' : 'Add Custom Provider'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
