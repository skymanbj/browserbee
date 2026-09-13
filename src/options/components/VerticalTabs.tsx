import { useState } from 'react';
import { useAppDispatch, useAppSelector, type RootState } from '../../store/hooks';
import {
  setGeminiApiKey,
  setGeminiBaseUrl,
  setGeminiModelId,
  setIsSaving,
  setNewInstance,
  setNewModel,
  setOpenaiCompatibleInstances,
  setProvider,
  setSaveStatus,
  setSelectedInstanceId,
} from '../../store/slices/configSlice';
import { setLanguage } from '../../store/slices/settingsSlice';
import { ThemeToggle } from './ThemeToggle';
import { GeneralTab } from './tabs/GeneralTab';
import { MemoryTab } from './tabs/MemoryTab';
import { PromptTemplateTab } from './tabs/PromptTemplateTab';
import { ProvidersTab } from './tabs/ProvidersTab';
import { ScheduledTaskTab } from './tabs/ScheduledTaskTab';
import { SessionTab } from './tabs/SessionTab';
import { SoulTab } from './tabs/SoulTab';
import { SyncTab } from './tabs/SyncTab';

export function VerticalTabs() {
  const [activeTab, setActiveTab] = useState('general');
  const language = useAppSelector((state) => state.settings.language);
  const dispatch = useAppDispatch();

  const provider = useAppSelector((state: RootState) => state.config.provider);
  const geminiApiKey = useAppSelector((state: RootState) => state.config.geminiApiKey);
  const geminiBaseUrl = useAppSelector((state: RootState) => state.config.geminiBaseUrl);
  const geminiModelId = useAppSelector((state: RootState) => state.config.geminiModelId);
  const openaiCompatibleInstances = useAppSelector((state: RootState) => state.config.openaiCompatibleInstances);
  const selectedInstanceId = useAppSelector((state: RootState) => state.config.selectedInstanceId);
  const newInstance = useAppSelector((state: RootState) => state.config.newInstance);
  const newModel = useAppSelector((state: RootState) => state.config.newModel);
  const isSaving = useAppSelector((state: RootState) => state.config.isSaving);
  const saveStatus = useAppSelector((state: RootState) => state.config.saveStatus);

  const t = (key: string): string => {
    const cleanKey = key.trim();
    const translationDict: Record<string, Record<string, string>> = {
      'General': { zh: '通用设置', en: 'General' },
      'LLM Configuration': { zh: '大模型配置', en: 'LLM Configuration' },
      'Memory': { zh: '记忆管理', en: 'Memory' },
      'Soul': { zh: '灵魂', en: 'Soul' },
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
    { id: 'soul', label: t('Soul'), icon: '👻' },
    { id: 'sessions', label: t('Sessions'), icon: '💬' },
    { id: 'scheduledTasks', label: t('Scheduled Tasks'), icon: '⏰' },
    { id: 'prompts', label: t('Prompt Templates'), icon: '📋' },
  ];

  const handleSave = () => {
    dispatch(setIsSaving(true));
    dispatch(setSaveStatus(''));

    chrome.storage.local.set({ openaiCompatibleInstances });

    chrome.storage.sync.set(
      {
        openaiCompatibleInstances,
        provider,
        geminiApiKey,
        geminiModelId,
        geminiBaseUrl,
      },
      () => {
        dispatch(setIsSaving(false));
        dispatch(setSaveStatus('Settings saved successfully!'));

        chrome.runtime.sendMessage(
          {
            action: 'providerConfigChanged',
          },
          () => {
            const err = chrome.runtime.lastError;
            if (err) {
              console.error('Error sending message:', err.message);
            }
          },
        );

        setTimeout(() => {
          dispatch(setSaveStatus(''));
        }, 3000);
      },
    );
  };

  const handleAddInstance = () => {
    if (!newInstance.id.trim() || !newInstance.name.trim()) return;
    if (openaiCompatibleInstances.some((inst: any) => inst.id === newInstance.id)) return;

    const newInst = {
      id: newInstance.id,
      name: newInstance.name,
      apiKey: '',
      baseUrl: '',
      modelId: '',
      models: [],
    };

    const updated = [...openaiCompatibleInstances, newInst];
    dispatch(setOpenaiCompatibleInstances(updated));
    dispatch(setNewInstance({ id: '', name: '' } as any));
    dispatch(setSelectedInstanceId(newInst.id));
    dispatch(setProvider(`openai-compatible:${newInst.id}`));
  };

  const handleRemoveInstance = (id: string) => {
    const updated = openaiCompatibleInstances.filter((inst: any) => inst.id !== id);
    dispatch(setOpenaiCompatibleInstances(updated));
    let newProvider = provider;
    if (provider === `openai-compatible:${id}`) {
      newProvider = 'gemini';
      dispatch(setProvider('gemini'));
    }
    if (selectedInstanceId === id) {
      dispatch(setSelectedInstanceId(null));
    }
    chrome.storage.local.set({ openaiCompatibleInstances: updated });
    chrome.storage.sync.set({ openaiCompatibleInstances: updated, provider: newProvider });
    chrome.runtime.sendMessage({ action: 'providerConfigChanged' });
  };

  const handleUpdateInstance = (id: string, field: string, value: any) => {
    dispatch(
      setOpenaiCompatibleInstances(
        openaiCompatibleInstances.map((inst: any) => (inst.id === id ? { ...inst, [field]: value } : inst)),
      ),
    );
  };

  const handleUpdateInstanceModel = (instanceId: string, idx: number, field: string, value: any) => {
    dispatch(
      setOpenaiCompatibleInstances(
        openaiCompatibleInstances.map((inst: any) => {
          if (inst.id !== instanceId) return inst;
          const models = inst.models.map((m: any, i: number) => (i === idx ? { ...m, [field]: value } : m));
          return { ...inst, models };
        }),
      ),
    );
  };

  const handleAddInstanceModel = (instanceId: string) => {
    if (!newModel.id.trim() || !newModel.name.trim()) return;

    dispatch(
      setOpenaiCompatibleInstances(
        openaiCompatibleInstances.map((inst: any) => {
          if (inst.id !== instanceId) return inst;
          return {
            ...inst,
            models: [
              ...inst.models,
              {
                id: newModel.id,
                name: newModel.name,
                isReasoningModel: newModel.isReasoningModel,
                contextWindow: newModel.contextWindow || 0,
                maxTokens: newModel.maxTokens || 0,
              },
            ],
          };
        }),
      ),
    );
    dispatch(setNewModel({ id: '', name: '', isReasoningModel: false, contextWindow: 0, maxTokens: 0 } as any));
  };

  const handleRemoveInstanceModel = (instanceId: string, modelId: string) => {
    dispatch(
      setOpenaiCompatibleInstances(
        openaiCompatibleInstances.map((inst: any) => {
          if (inst.id !== instanceId) return inst;
          const models = inst.models.filter((m: any) => m.id !== modelId);
          const modelIdUpdate = inst.modelId === modelId ? '' : inst.modelId;
          return { ...inst, models, modelId: modelIdUpdate };
        }),
      ),
    );
  };

  const getModelPricingData = () => {
    return [];
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralTab />;
      case 'providers':
        return (
          <ProvidersTab
            provider={provider}
            setProvider={(value) => dispatch(setProvider(value as any))}
            geminiApiKey={geminiApiKey}
            setGeminiApiKey={(value) => dispatch(setGeminiApiKey(value as any))}
            geminiBaseUrl={geminiBaseUrl}
            setGeminiBaseUrl={(value) => dispatch(setGeminiBaseUrl(value as any))}
            geminiModelId={geminiModelId}
            setGeminiModelId={(value) => dispatch(setGeminiModelId(value as any))}
            openaiCompatibleInstances={openaiCompatibleInstances}
            setOpenaiCompatibleInstances={(value) => dispatch(setOpenaiCompatibleInstances(value as any))}
            newInstance={newInstance}
            setNewInstance={(value) => dispatch(setNewInstance(value as any))}
            handleAddInstance={handleAddInstance}
            handleRemoveInstance={handleRemoveInstance}
            handleUpdateInstance={handleUpdateInstance}
            handleUpdateInstanceModel={handleUpdateInstanceModel}
            handleAddInstanceModel={handleAddInstanceModel}
            handleRemoveInstanceModel={handleRemoveInstanceModel}
            selectedInstanceId={selectedInstanceId}
            setSelectedInstanceId={(value) => dispatch(setSelectedInstanceId(value as any))}
            newModel={newModel}
            setNewModel={(value) => dispatch(setNewModel(value as any))}
            isSaving={isSaving}
            saveStatus={saveStatus}
            handleSave={handleSave}
            getModelPricingData={getModelPricingData}
          />
        );
      case 'sync':
        return <SyncTab />;
      case 'memory':
        return <MemoryTab />;
      case 'soul':
        return <SoulTab />;
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
                className={`tab tab-lg justify-start gap-3 w-full ${activeTab === tab.id ? 'tab-active' : ''}`}
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
                onClick={() => dispatch(setLanguage('zh'))}
                className={`join-item btn btn-xs btn-outline ${language === 'zh' ? 'btn-active btn-primary' : 'opacity-70'}`}
              >
                中文
              </button>
              <button
                onClick={() => dispatch(setLanguage('en'))}
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
