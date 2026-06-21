import { useState, useEffect } from 'react';
import { 
  anthropicModels, 
  openaiModels, 
  geminiModels, 
  ollamaModels,
  anthropicDefaultModelId,
  openaiDefaultModelId,
  geminiDefaultModelId,
  ollamaDefaultModelId
} from '../models/models';
import { OpenAICompatibleInstance } from '../models/providers/openai-compatible';

import { VerticalTabs } from './components/VerticalTabs';
import { Model } from './components/ModelList';
import { OllamaModel } from './components/OllamaModelList';

export function Options() {
  const getModelPricingData = () => {
    const allModels = [
      ...Object.entries(anthropicModels).map(([id, model]) => ({ 
        id, provider: 'Anthropic', ...model 
      })),
      ...Object.entries(openaiModels).map(([id, model]) => ({ 
        id, provider: 'OpenAI', ...model 
      })),
      ...Object.entries(geminiModels).map(([id, model]) => ({ 
        id, provider: 'Google', ...model 
      })),
      {
        id: 'ollama',
        provider: 'Ollama',
        name: 'Ollama',
        inputPrice: 0.0,
        outputPrice: 0.0,
        maxTokens: 4096,
        contextWindow: 32768,
        supportsImages: false,
        supportsPromptCache: false,
      }
    ];
    
    return allModels.sort((a, b) => a.outputPrice - b.outputPrice);
  };
  
  const [provider, setProvider] = useState('anthropic');
  
  // Anthropic settings
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [anthropicBaseUrl, setAnthropicBaseUrl] = useState('');
  
  // OpenAI settings
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('');
  
  // Gemini settings
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiBaseUrl, setGeminiBaseUrl] = useState('');
  
  // Ollama settings
  const [ollamaApiKey, setOllamaApiKey] = useState('');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('');
  const [ollamaCustomModels, setOllamaCustomModels] = useState<OllamaModel[]>([]);
  const [newOllamaModel, setNewOllamaModel] = useState({ id: '', name: '', contextWindow: 32768 });
  
  // Model IDs - using defaults from models.ts
  const [anthropicModelId, setAnthropicModelId] = useState(anthropicDefaultModelId);
  const [openaiModelId, setOpenaiModelId] = useState(openaiDefaultModelId);
  const [geminiModelId, setGeminiModelId] = useState(geminiDefaultModelId);
  const [ollamaModelId, setOllamaModelId] = useState(ollamaDefaultModelId);
  
  // Common settings
  const [thinkingBudgetTokens, setThinkingBudgetTokens] = useState(0);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  // OpenAI-compatible instance state
  const [openaiCompatibleInstances, setOpenaiCompatibleInstances] = useState<OpenAICompatibleInstance[]>([]);
  const [newInstance, setNewInstance] = useState({ id: '', name: '' });
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [newModel, setNewModel] = useState({ id: '', name: '', isReasoningModel: false, contextWindow: 0, maxTokens: 0 });

  // Migration: convert old flat openai-compatible keys to instance array
  const migrateOldOpenAICompatibleData = async (): Promise<{ instances: OpenAICompatibleInstance[]; provider: string }> => {
    const result = await chrome.storage.sync.get({
      openaiCompatibleInstances: null as OpenAICompatibleInstance[] | null,
      openaiCompatibleApiKey: '',
      openaiCompatibleBaseUrl: '',
      openaiCompatibleModelId: '',
      openaiCompatibleModels: [] as any[],
      provider: 'anthropic',
    });

    if (result.openaiCompatibleInstances !== null && Array.isArray(result.openaiCompatibleInstances)) {
      return { instances: result.openaiCompatibleInstances, provider: result.provider };
    }

    const hasOldData = result.openaiCompatibleApiKey || result.openaiCompatibleBaseUrl || (result.openaiCompatibleModels && result.openaiCompatibleModels.length > 0);
    let instances: OpenAICompatibleInstance[] = [];
    let currentProvider = result.provider;

    if (hasOldData) {
      instances = [{
        id: 'default',
        name: 'OpenAI Compatible',
        apiKey: result.openaiCompatibleApiKey || '',
        baseUrl: result.openaiCompatibleBaseUrl || '',
        modelId: result.openaiCompatibleModelId || '',
        models: (result.openaiCompatibleModels || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          isReasoningModel: m.isReasoningModel || false,
          contextWindow: m.contextWindow || 0,
          maxTokens: m.maxTokens || 0,
        })),
      }];

      await chrome.storage.sync.set({ openaiCompatibleInstances: instances });

      if (currentProvider === 'openai-compatible') {
        currentProvider = 'openai-compatible:default';
        await chrome.storage.sync.set({ provider: currentProvider });
      }

      await chrome.storage.sync.remove([
        'openaiCompatibleApiKey',
        'openaiCompatibleBaseUrl',
        'openaiCompatibleModelId',
        'openaiCompatibleModels',
      ]);
    } else {
      await chrome.storage.sync.set({ openaiCompatibleInstances: [] });
    }

    return { instances, provider: currentProvider };
  };

  // Load saved settings when component mounts
  useEffect(() => {
    (async () => {
      const { instances, provider: migratedProvider } = await migrateOldOpenAICompatibleData();
      
      const result = await chrome.storage.sync.get({
        provider: 'anthropic',
        anthropicApiKey: '',
        anthropicModelId: anthropicDefaultModelId,
        anthropicBaseUrl: '',
        openaiApiKey: '',
        openaiModelId: openaiDefaultModelId,
        openaiBaseUrl: '',
        geminiApiKey: '',
        geminiModelId: geminiDefaultModelId,
        geminiBaseUrl: '',
        ollamaApiKey: '',
        ollamaModelId: ollamaDefaultModelId,
        ollamaBaseUrl: '',
        ollamaCustomModels: [],
        thinkingBudgetTokens: 0,
        openaiCompatibleInstances: [] as OpenAICompatibleInstance[],
      });
      
      setProvider(result.provider);
      setAnthropicApiKey(result.anthropicApiKey);
      setAnthropicModelId(result.anthropicModelId);
      setAnthropicBaseUrl(result.anthropicBaseUrl);
      setOpenaiApiKey(result.openaiApiKey);
      setOpenaiModelId(result.openaiModelId);
      setOpenaiBaseUrl(result.openaiBaseUrl);
      setGeminiApiKey(result.geminiApiKey);
      setGeminiModelId(result.geminiModelId);
      setGeminiBaseUrl(result.geminiBaseUrl);
      setOllamaApiKey(result.ollamaApiKey);
      setOllamaModelId(result.ollamaModelId);
      setOllamaBaseUrl(result.ollamaBaseUrl || '');
      setOllamaCustomModels(result.ollamaCustomModels || []);
      setThinkingBudgetTokens(result.thinkingBudgetTokens);
      setOpenaiCompatibleInstances(result.openaiCompatibleInstances || instances);
    })();
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    setSaveStatus('');

    chrome.storage.sync.set({
      provider,
      anthropicApiKey,
      anthropicModelId,
      anthropicBaseUrl,
      openaiApiKey,
      openaiModelId,
      openaiBaseUrl,
      geminiApiKey,
      geminiModelId,
      geminiBaseUrl,
      ollamaApiKey,
      ollamaModelId,
      ollamaBaseUrl,
      ollamaCustomModels,
      thinkingBudgetTokens,
      openaiCompatibleInstances,
    }, () => {
      
      setIsSaving(false);
      setSaveStatus('Settings saved successfully!');
      
      chrome.runtime.sendMessage({
        action: 'providerConfigChanged'
      }).catch(err => console.error('Error sending message:', err));
      
      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    });
  };

  // Ollama model list operations
  const handleAddOllamaModel = () => {
    if (!newOllamaModel.id.trim() || !newOllamaModel.name.trim()) return;
    
    const updatedModels = [...ollamaCustomModels, { ...newOllamaModel }];
    setOllamaCustomModels(updatedModels);
    setNewOllamaModel({ id: '', name: '', contextWindow: 32768 });
    
    chrome.storage.sync.set({ ollamaCustomModels: updatedModels });
  };
  
  const handleRemoveOllamaModel = (id: string) => {
    const updatedModels = ollamaCustomModels.filter(m => m.id !== id);
    setOllamaCustomModels(updatedModels);
    if (ollamaModelId === id) setOllamaModelId('');
    
    chrome.storage.sync.set({ ollamaCustomModels: updatedModels });
  };
  
  const handleEditOllamaModel = (idx: number, field: string, value: any) => {
    let updatedModels: OllamaModel[] = [];
    setOllamaCustomModels(models => {
      updatedModels = models.map((m, i) => i === idx ? { ...m, [field]: value } : m);
      return updatedModels;
    });
    
    setTimeout(() => {
      chrome.storage.sync.set({ ollamaCustomModels: updatedModels });
    }, 0);
  };

  // OpenAI-compatible instance operations
  const handleAddInstance = () => {
    if (!newInstance.id.trim() || !newInstance.name.trim()) return;
    if (openaiCompatibleInstances.some(inst => inst.id === newInstance.id)) return;

    const newInst: OpenAICompatibleInstance = {
      id: newInstance.id,
      name: newInstance.name,
      apiKey: '',
      baseUrl: '',
      modelId: '',
      models: [],
    };

    const updated = [...openaiCompatibleInstances, newInst];
    setOpenaiCompatibleInstances(updated);
    setNewInstance({ id: '', name: '' });
    setSelectedInstanceId(newInst.id);
    setProvider(`openai-compatible:${newInst.id}`);
  };

  const handleRemoveInstance = (id: string) => {
    const updated = openaiCompatibleInstances.filter(inst => inst.id !== id);
    setOpenaiCompatibleInstances(updated);
    if (provider === `openai-compatible:${id}`) {
      setProvider('anthropic');
    }
    if (selectedInstanceId === id) {
      setSelectedInstanceId(null);
    }
  };

  const handleUpdateInstance = (id: string, field: string, value: any) => {
    setOpenaiCompatibleInstances(prev =>
      prev.map(inst => inst.id === id ? { ...inst, [field]: value } : inst)
    );
  };

  const handleUpdateInstanceModel = (instanceId: string, idx: number, field: string, value: any) => {
    setOpenaiCompatibleInstances(prev =>
      prev.map(inst => {
        if (inst.id !== instanceId) return inst;
        const models = inst.models.map((m, i) => i === idx ? { ...m, [field]: value } : m);
        return { ...inst, models };
      })
    );
  };

  const handleAddInstanceModel = (instanceId: string) => {
    if (!newModel.id.trim() || !newModel.name.trim()) return;

    setOpenaiCompatibleInstances(prev =>
      prev.map(inst => {
        if (inst.id !== instanceId) return inst;
        return {
          ...inst,
          models: [...inst.models, {
            id: newModel.id,
            name: newModel.name,
            isReasoningModel: newModel.isReasoningModel,
            contextWindow: newModel.contextWindow || 0,
            maxTokens: newModel.maxTokens || 0,
          }],
        };
      })
    );
    setNewModel({ id: '', name: '', isReasoningModel: false, contextWindow: 0, maxTokens: 0 });
  };

  const handleRemoveInstanceModel = (instanceId: string, modelId: string) => {
    setOpenaiCompatibleInstances(prev =>
      prev.map(inst => {
        if (inst.id !== instanceId) return inst;
        const models = inst.models.filter(m => m.id !== modelId);
        const modelIdUpdate = inst.modelId === modelId ? '' : inst.modelId;
        return { ...inst, models, modelId: modelIdUpdate };
      })
    );
  };

  return (
    <VerticalTabs
      provider={provider}
      setProvider={setProvider}
      anthropicApiKey={anthropicApiKey}
      setAnthropicApiKey={setAnthropicApiKey}
      anthropicBaseUrl={anthropicBaseUrl}
      setAnthropicBaseUrl={setAnthropicBaseUrl}
      thinkingBudgetTokens={thinkingBudgetTokens}
      setThinkingBudgetTokens={setThinkingBudgetTokens}
      openaiApiKey={openaiApiKey}
      setOpenaiApiKey={setOpenaiApiKey}
      openaiBaseUrl={openaiBaseUrl}
      setOpenaiBaseUrl={setOpenaiBaseUrl}
      geminiApiKey={geminiApiKey}
      setGeminiApiKey={setGeminiApiKey}
      geminiBaseUrl={geminiBaseUrl}
      setGeminiBaseUrl={setGeminiBaseUrl}
      ollamaApiKey={ollamaApiKey}
      setOllamaApiKey={setOllamaApiKey}
      ollamaBaseUrl={ollamaBaseUrl}
      setOllamaBaseUrl={setOllamaBaseUrl}
      ollamaModelId={ollamaModelId}
      setOllamaModelId={setOllamaModelId}
      ollamaCustomModels={ollamaCustomModels}
      setOllamaCustomModels={setOllamaCustomModels}
      newOllamaModel={newOllamaModel}
      setNewOllamaModel={setNewOllamaModel}
      handleAddOllamaModel={handleAddOllamaModel}
      handleRemoveOllamaModel={handleRemoveOllamaModel}
      handleEditOllamaModel={handleEditOllamaModel}
      openaiCompatibleInstances={openaiCompatibleInstances}
      setOpenaiCompatibleInstances={setOpenaiCompatibleInstances}
      newInstance={newInstance}
      setNewInstance={setNewInstance}
      handleAddInstance={handleAddInstance}
      handleRemoveInstance={handleRemoveInstance}
      handleUpdateInstance={handleUpdateInstance}
      handleUpdateInstanceModel={handleUpdateInstanceModel}
      handleAddInstanceModel={handleAddInstanceModel}
      handleRemoveInstanceModel={handleRemoveInstanceModel}
      selectedInstanceId={selectedInstanceId}
      setSelectedInstanceId={setSelectedInstanceId}
      newModel={newModel}
      setNewModel={setNewModel}
      isSaving={isSaving}
      saveStatus={saveStatus}
      handleSave={handleSave}
      getModelPricingData={getModelPricingData}
    />
  );
}
