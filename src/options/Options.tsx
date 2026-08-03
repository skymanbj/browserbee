import { useEffect } from 'react';
import {
  anthropicModels,
  geminiModels,
  openaiModels
} from '../models/models';
import { OpenAICompatibleInstance } from '../models/providers/openai-compatible';

import { useAppDispatch, useAppSelector, type RootState } from '../store/hooks';
import {
  fetchConfig,
  setIsSaving,
  setNewInstance,
  setNewModel,
  setNewOllamaModel,
  setOllamaCustomModels,
  setOllamaModelId,
  setOpenaiCompatibleInstances,
  setProvider,
  setSaveStatus,
  setSelectedInstanceId
} from '../store/slices/configSlice';
import { VerticalTabs } from './components/VerticalTabs';

export function Options() {
  const dispatch = useAppDispatch();

  const getModelPricingData = () => {
    const allModels = [
      ...Object.entries(anthropicModels).map(([id, model]) => ({
        id,
        provider: 'Anthropic',
        ...model,
      })),
      ...Object.entries(openaiModels).map(([id, model]) => ({
        id,
        provider: 'OpenAI',
        ...model,
      })),
      ...Object.entries(geminiModels).map(([id, model]) => ({
        id,
        provider: 'Google',
        ...model,
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
      },
    ];

    return allModels.sort((a, b) => a.outputPrice - b.outputPrice);
  };

  const provider = useAppSelector((state: RootState) => state.config.provider);
  const anthropicApiKey = useAppSelector((state: RootState) => state.config.anthropicApiKey);
  const anthropicBaseUrl = useAppSelector((state: RootState) => state.config.anthropicBaseUrl);
  const anthropicModelId = useAppSelector((state: RootState) => state.config.anthropicModelId);
  const openaiApiKey = useAppSelector((state: RootState) => state.config.openaiApiKey);
  const openaiBaseUrl = useAppSelector((state: RootState) => state.config.openaiBaseUrl);
  const openaiModelId = useAppSelector((state: RootState) => state.config.openaiModelId);
  const geminiApiKey = useAppSelector((state: RootState) => state.config.geminiApiKey);
  const geminiBaseUrl = useAppSelector((state: RootState) => state.config.geminiBaseUrl);
  const geminiModelId = useAppSelector((state: RootState) => state.config.geminiModelId);
  const ollamaApiKey = useAppSelector((state: RootState) => state.config.ollamaApiKey);
  const ollamaBaseUrl = useAppSelector((state: RootState) => state.config.ollamaBaseUrl);
  const ollamaModelId = useAppSelector((state: RootState) => state.config.ollamaModelId);
  const ollamaCustomModels = useAppSelector((state: RootState) => state.config.ollamaCustomModels);
  const thinkingBudgetTokens = useAppSelector((state: RootState) => state.config.thinkingBudgetTokens);
  const openaiCompatibleInstances = useAppSelector((state: RootState) => state.config.openaiCompatibleInstances);
  const selectedInstanceId = useAppSelector((state: RootState) => state.config.selectedInstanceId);
  const newInstance = useAppSelector((state: RootState) => state.config.newInstance);
  const newModel = useAppSelector((state: RootState) => state.config.newModel);
  const newOllamaModel = useAppSelector((state: RootState) => state.config.newOllamaModel);
  const isSaving = useAppSelector((state: RootState) => state.config.isSaving);
  const saveStatus = useAppSelector((state: RootState) => state.config.saveStatus);

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

    const hasOldData =
      result.openaiCompatibleApiKey ||
      result.openaiCompatibleBaseUrl ||
      (result.openaiCompatibleModels && result.openaiCompatibleModels.length > 0);
    let instances: OpenAICompatibleInstance[] = [];
    let currentProvider = result.provider;

    if (hasOldData) {
      instances = [
        {
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
        },
      ];

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

  useEffect(() => {
    (async () => {
      await migrateOldOpenAICompatibleData();
      await dispatch(fetchConfig());
    })();
  }, [dispatch]);

  const handleSave = () => {
    dispatch(setIsSaving(true));
    dispatch(setSaveStatus(''));

    chrome.storage.local.set({ openaiCompatibleInstances });

    chrome.storage.sync.set(
      {
        openaiCompatibleInstances,
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

  const handleAddOllamaModel = () => {
    if (!newOllamaModel.id.trim() || !newOllamaModel.name.trim()) return;

    const updatedModels = [...ollamaCustomModels, { ...newOllamaModel }];
    dispatch(setOllamaCustomModels(updatedModels));
    dispatch(setNewOllamaModel({ id: '', name: '', contextWindow: 32768 }));

    chrome.storage.sync.set({ ollamaCustomModels: updatedModels });
  };

  const handleRemoveOllamaModel = (id: string) => {
    const updatedModels = ollamaCustomModels.filter((m: any) => m.id !== id);
    dispatch(setOllamaCustomModels(updatedModels));
    if (ollamaModelId === id) dispatch(setOllamaModelId(''));

    chrome.storage.sync.set({ ollamaCustomModels: updatedModels });
  };

  const handleEditOllamaModel = (idx: number, field: string, value: any) => {
    const updatedModels = ollamaCustomModels.map((m: any, i: number) => (i === idx ? { ...m, [field]: value } : m));
    dispatch(setOllamaCustomModels(updatedModels));

    setTimeout(() => {
      chrome.storage.sync.set({ ollamaCustomModels: updatedModels });
    }, 0);
  };

  const handleAddInstance = () => {
    if (!newInstance.id.trim() || !newInstance.name.trim()) return;
    if (openaiCompatibleInstances.some((inst: any) => inst.id === newInstance.id)) return;

    const newInst: OpenAICompatibleInstance = {
      id: newInstance.id,
      name: newInstance.name,
      apiKey: '',
      baseUrl: '',
      modelId: '',
      models: [],
    };

    const updated = [...openaiCompatibleInstances, newInst];
    dispatch(setOpenaiCompatibleInstances(updated));
    dispatch(setNewInstance({ id: '', name: '' }));
    dispatch(setSelectedInstanceId(newInst.id));
    dispatch(setProvider(`openai-compatible:${newInst.id}`));
  };

  const handleRemoveInstance = (id: string) => {
    const updated = openaiCompatibleInstances.filter((inst: any) => inst.id !== id);
    dispatch(setOpenaiCompatibleInstances(updated));
    let newProvider = provider;
    if (provider === `openai-compatible:${id}`) {
      newProvider = 'anthropic';
      dispatch(setProvider('anthropic'));
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
    dispatch(setNewModel({ id: '', name: '', isReasoningModel: false, contextWindow: 0, maxTokens: 0 }));
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

  return <VerticalTabs />;
}
