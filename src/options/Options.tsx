import { useEffect } from 'react';
import {
  geminiModels
} from '../models/models';
import { OpenAICompatibleInstance } from '../models/providers/openai-compatible';

import { useAppDispatch, useAppSelector, type RootState } from '../store/hooks';
import {
  fetchConfig,
  setIsSaving,
  setNewInstance,
  setNewModel,
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
      ...Object.entries(geminiModels).map(([id, model]) => ({
        id,
        provider: 'Google',
        ...model,
      })),
    ];

    return allModels.sort((a, b) => a.outputPrice - b.outputPrice);
  };

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

  const migrateOldOpenAICompatibleData = async (): Promise<{ instances: OpenAICompatibleInstance[]; provider: string }> => {
    const result = await chrome.storage.sync.get({
      openaiCompatibleInstances: null as OpenAICompatibleInstance[] | null,
      openaiCompatibleApiKey: '',
      openaiCompatibleBaseUrl: '',
      openaiCompatibleModelId: '',
      openaiCompatibleModels: [] as any[],
      provider: 'gemini',
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
      // Clean up leftover storage keys from removed providers
      const { ConfigManager } = await import('../background/configManager');
      await ConfigManager.getInstance().cleanupRemovedProviders();
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
