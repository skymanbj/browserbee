import React, { useState } from 'react';
import { OpenAICompatibleInstance } from '../../models/providers/openai-compatible';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setLanguage } from '../../store/slices/settingsSlice';
import { OllamaModel } from './OllamaModelList';
import { ThemeToggle } from './ThemeToggle';
import { GeneralTab } from './tabs/GeneralTab';
import { MemoryTab } from './tabs/MemoryTab';
import { PromptTemplateTab } from './tabs/PromptTemplateTab';
import { ProvidersTab } from './tabs/ProvidersTab';
import { ScheduledTaskTab } from './tabs/ScheduledTaskTab';
import { SessionTab } from './tabs/SessionTab';
import { SyncTab } from './tabs/SyncTab';

interface VerticalTabsProps {
  provider: string;
  setProvider: (provider: string) => void;
  anthropicApiKey: string;
  setAnthropicApiKey: (key: string) => void;
  anthropicBaseUrl: string;
  setAnthropicBaseUrl: (url: string) => void;
  thinkingBudgetTokens: number;
  setThinkingBudgetTokens: (tokens: number) => void;
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
  openaiBaseUrl: string;
  setOpenaiBaseUrl: (url: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  geminiBaseUrl: string;
  setGeminiBaseUrl: (url: string) => void;
  ollamaApiKey: string;
  setOllamaApiKey: (key: string) => void;
  ollamaBaseUrl: string;
  setOllamaBaseUrl: (url: string) => void;
  ollamaModelId: string;
  setOllamaModelId: (id: string) => void;
  ollamaCustomModels: OllamaModel[];
  setOllamaCustomModels: (models: OllamaModel[]) => void;
  newOllamaModel: { id: string; name: string; contextWindow: number };
  setNewOllamaModel: React.Dispatch<React.SetStateAction<{ id: string; name: string; contextWindow: number }>>;
  handleAddOllamaModel: () => void;
  handleRemoveOllamaModel: (id: string) => void;
  handleEditOllamaModel: (idx: number, field: string, value: any) => void;
  openaiCompatibleInstances: OpenAICompatibleInstance[];
  setOpenaiCompatibleInstances: (instances: OpenAICompatibleInstance[]) => void;
  newInstance: { id: string; name: string };
  setNewInstance: React.Dispatch<React.SetStateAction<{ id: string; name: string }>>;
  handleAddInstance: () => void;
  handleRemoveInstance: (id: string) => void;
  handleUpdateInstance: (id: string, field: string, value: any) => void;
  handleUpdateInstanceModel: (instanceId: string, idx: number, field: string, value: any) => void;
  handleAddInstanceModel: (instanceId: string) => void;
  handleRemoveInstanceModel: (instanceId: string, modelId: string) => void;
  selectedInstanceId: string | null;
  setSelectedInstanceId: (id: string | null) => void;
  newModel: { id: string; name: string; isReasoningModel: boolean; contextWindow: number; maxTokens: number };
  setNewModel: React.Dispatch<React.SetStateAction<{ id: string; name: string; isReasoningModel: boolean; contextWindow: number; maxTokens: number }>>;
  isSaving: boolean;
  saveStatus: string;
  handleSave: () => void;
  getModelPricingData: () => any[];
}

export function VerticalTabs(props: VerticalTabsProps) {
  const [activeTab, setActiveTab] = useState('general');
  const language = useAppSelector((state) => state.settings.language);
  const dispatch = useAppDispatch();

  const t = (key: string): string => {
    const cleanKey = key.trim();
    const translationDict: Record<string, Record<string, string>> = {
      'General': { zh: '通用设置', en: 'General' },
      'LLM Configuration': { zh: '大模型配置', en: 'LLM Configuration' },
      'Memory': { zh: '记忆管理', en: 'Memory' },
      'Sessions': { zh: '会话管理', en: 'Sessions' },
      'Scheduled Tasks': { zh: '定时任务', en: 'Scheduled Tasks' },
      'Prompt Templates': { zh: '提示词模板', en: 'Prompt Templates' },
      'Cloud Sync': { zh: '云同步', en: 'Cloud Sync' }
    };
    const translated = translationDict[cleanKey]?.[language];
    return translated ?? key;
  };

  const tabs = [
    { id: 'general', label: t('General'), icon: '🏠' },
    { id: 'providers', label: t('LLM Configuration'), icon: '🤖' },
    { id: 'sync', label: t('Cloud Sync'), icon: '☁️' },
    { id: 'memory', label: t('Memory'), icon: '🧠' },
    { id: 'sessions', label: t('Sessions'), icon: '💬' },
    { id: 'scheduledTasks', label: t('Scheduled Tasks'), icon: '⏰' },
    { id: 'prompts', label: t('Prompt Templates'), icon: '📋' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralTab />;
      case 'providers':
        return (
          <ProvidersTab
            provider={props.provider}
            setProvider={props.setProvider}
            anthropicApiKey={props.anthropicApiKey}
            setAnthropicApiKey={props.setAnthropicApiKey}
            anthropicBaseUrl={props.anthropicBaseUrl}
            setAnthropicBaseUrl={props.setAnthropicBaseUrl}
            thinkingBudgetTokens={props.thinkingBudgetTokens}
            setThinkingBudgetTokens={props.setThinkingBudgetTokens}
            openaiApiKey={props.openaiApiKey}
            setOpenaiApiKey={props.setOpenaiApiKey}
            openaiBaseUrl={props.openaiBaseUrl}
            setOpenaiBaseUrl={props.setOpenaiBaseUrl}
            geminiApiKey={props.geminiApiKey}
            setGeminiApiKey={props.setGeminiApiKey}
            geminiBaseUrl={props.geminiBaseUrl}
            setGeminiBaseUrl={props.setGeminiBaseUrl}
            ollamaApiKey={props.ollamaApiKey}
            setOllamaApiKey={props.setOllamaApiKey}
            ollamaBaseUrl={props.ollamaBaseUrl}
            setOllamaBaseUrl={props.setOllamaBaseUrl}
            ollamaModelId={props.ollamaModelId}
            setOllamaModelId={props.setOllamaModelId}
            ollamaCustomModels={props.ollamaCustomModels}
            setOllamaCustomModels={props.setOllamaCustomModels}
            newOllamaModel={props.newOllamaModel}
            setNewOllamaModel={props.setNewOllamaModel}
            handleAddOllamaModel={props.handleAddOllamaModel}
            handleRemoveOllamaModel={props.handleRemoveOllamaModel}
            handleEditOllamaModel={props.handleEditOllamaModel}
            openaiCompatibleInstances={props.openaiCompatibleInstances}
            setOpenaiCompatibleInstances={props.setOpenaiCompatibleInstances}
            newInstance={props.newInstance}
            setNewInstance={props.setNewInstance}
            handleAddInstance={props.handleAddInstance}
            handleRemoveInstance={props.handleRemoveInstance}
            handleUpdateInstance={props.handleUpdateInstance}
            handleUpdateInstanceModel={props.handleUpdateInstanceModel}
            handleAddInstanceModel={props.handleAddInstanceModel}
            handleRemoveInstanceModel={props.handleRemoveInstanceModel}
            selectedInstanceId={props.selectedInstanceId}
            setSelectedInstanceId={props.setSelectedInstanceId}
            newModel={props.newModel}
            setNewModel={props.setNewModel}
            isSaving={props.isSaving}
            saveStatus={props.saveStatus}
            handleSave={props.handleSave}
            getModelPricingData={props.getModelPricingData}
          />
        );
      case 'sync':
        return <SyncTab />;
      case 'memory':
        return <MemoryTab />;
      case 'sessions':
        return <SessionTab />;
      case 'scheduledTasks':
        return <ScheduledTaskTab />;
      case 'prompts':
        return <PromptTemplateTab />;
      default:
        return <GeneralTab />;
    }
  };

  return (
    <div className="flex min-h-screen bg-base-200">
      {/* Left Sidebar - Vertical Tabs */}
      <div className="w-64 bg-base-100 shadow-lg flex flex-col">
        <div className="p-4 flex-1">
          <h1 className="text-2xl font-bold text-primary mb-6">BrowserBee 🐝</h1>
          <div className="tabs tabs-vertical w-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab tab-lg justify-start gap-3 w-full ${activeTab === tab.id ? 'tab-active' : ''
                  }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Theme Toggle and Language Toggle at bottom of sidebar */}
        <div className="p-4 border-t border-base-200 flex flex-col gap-3">
          <ThemeToggle />
          <div className="flex items-center justify-between px-2 text-xs">
            <span className="opacity-70">{language === 'zh' ? '界面语言' : 'Language'}</span>
            <div className="join">
              <button
                onClick={() => setLanguage('zh')}
                className={`join-item btn btn-xs btn-outline ${language === 'zh' ? 'btn-active btn-primary' : 'opacity-70'}`}
              >
                中文
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`join-item btn btn-xs btn-outline ${language === 'en' ? 'btn-active btn-primary' : 'opacity-70'}`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 p-6 overflow-auto">
        {renderTabContent()}
      </div>
    </div>
  );
}
