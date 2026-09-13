import React from 'react';
import { OpenAICompatibleInstance } from '../../models/providers/openai-compatible';
import { GeminiSettings } from './GeminiSettings';
import { Model } from './ModelList';
import { OpenAICompatibleSettings } from './OpenAICompatibleSettings';

interface ProviderSettingsProps {
  provider: string;

  // Gemini settings
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  geminiBaseUrl: string;
  setGeminiBaseUrl: (url: string) => void;
  geminiModelId: string;
  setGeminiModelId: (id: string) => void;

  // OpenAI-compatible instance settings
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
}

export function ProviderSettings({
  provider,
  // Gemini
  geminiApiKey,
  setGeminiApiKey,
  geminiBaseUrl,
  setGeminiBaseUrl,
  // OpenAI-compatible
  openaiCompatibleInstances,
  newInstance,
  setNewInstance,
  handleUpdateInstance,
  handleUpdateInstanceModel,
  handleAddInstanceModel,
  handleRemoveInstanceModel,
  handleRemoveInstance,
  newModel,
  setNewModel,
}: ProviderSettingsProps) {
  return (
    <>
      {provider === 'gemini' && (
        <GeminiSettings
          geminiApiKey={geminiApiKey}
          setGeminiApiKey={setGeminiApiKey}
          geminiBaseUrl={geminiBaseUrl}
          setGeminiBaseUrl={setGeminiBaseUrl}
        />
      )}

      {provider.startsWith('openai-compatible:') && (() => {
        const selectedInstance = openaiCompatibleInstances.find(inst => inst.id === provider.split(':')[1]) || null;
        if (!selectedInstance) return null;
        return (
          <OpenAICompatibleSettings
            instanceId={selectedInstance.id}
            instanceName={selectedInstance.name}
            setInstanceName={(name: string) => handleUpdateInstance(selectedInstance.id, 'name', name)}
            apiKey={selectedInstance.apiKey}
            setApiKey={(key: string) => handleUpdateInstance(selectedInstance.id, 'apiKey', key)}
            baseUrl={selectedInstance.baseUrl}
            setBaseUrl={(url: string) => handleUpdateInstance(selectedInstance.id, 'baseUrl', url)}
            modelId={selectedInstance.modelId}
            setModelId={(id: string) => handleUpdateInstance(selectedInstance.id, 'modelId', id)}
            models={selectedInstance.models.map(m => ({
              id: m.id,
              name: m.name,
              isReasoningModel: m.isReasoningModel || false,
              contextWindow: m.contextWindow || 0,
              maxTokens: m.maxTokens || 0,
            }))}
            setModels={(models: Model[]) => handleUpdateInstance(selectedInstance.id, 'models', models)}
            newModel={newModel}
            setNewModel={setNewModel}
            handleAddModel={() => handleAddInstanceModel(selectedInstance.id)}
            handleRemoveModel={(modelId: string) => handleRemoveInstanceModel(selectedInstance.id, modelId)}
            handleEditModel={(idx: number, field: string, value: any) => handleUpdateInstanceModel(selectedInstance.id, idx, field, value)}
            handleRemoveInstance={handleRemoveInstance}
            enabledModelIds={selectedInstance.enabledModelIds || []}
            setEnabledModelIds={(ids: string[]) => handleUpdateInstance(selectedInstance.id, 'enabledModelIds', ids)}
          />
        );
      })()}
    </>
  );
}
