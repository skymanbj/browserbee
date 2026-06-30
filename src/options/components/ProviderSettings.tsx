import React from 'react';
import { AnthropicSettings } from './AnthropicSettings';
import { GeminiSettings } from './GeminiSettings';
import { Model } from './ModelList';
import { OllamaModel } from './OllamaModelList';
import { OllamaSettings } from './OllamaSettings';
import { OpenAICompatibleSettings } from './OpenAICompatibleSettings';
import { OpenAICompatibleInstanceManager } from './OpenAICompatibleInstanceManager';
import { OpenAICompatibleInstance } from '../../models/providers/openai-compatible';
import { OpenAISettings } from './OpenAISettings';

interface ProviderSettingsProps {
  provider: string;
  // Anthropic settings
  anthropicApiKey: string;
  setAnthropicApiKey: (key: string) => void;
  anthropicBaseUrl: string;
  setAnthropicBaseUrl: (url: string) => void;
  thinkingBudgetTokens: number;
  setThinkingBudgetTokens: (tokens: number) => void;
  
  // OpenAI settings
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
  openaiBaseUrl: string;
  setOpenaiBaseUrl: (url: string) => void;
  
  // Gemini settings
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  geminiBaseUrl: string;
  setGeminiBaseUrl: (url: string) => void;
  
  // Ollama settings
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
  // Anthropic
  anthropicApiKey,
  setAnthropicApiKey,
  anthropicBaseUrl,
  setAnthropicBaseUrl,
  thinkingBudgetTokens,
  setThinkingBudgetTokens,
  // OpenAI
  openaiApiKey,
  setOpenaiApiKey,
  openaiBaseUrl,
  setOpenaiBaseUrl,
  // Gemini
  geminiApiKey,
  setGeminiApiKey,
  geminiBaseUrl,
  setGeminiBaseUrl,
  // Ollama
  ollamaApiKey,
  setOllamaApiKey,
  ollamaBaseUrl,
  setOllamaBaseUrl,
  ollamaModelId,
  setOllamaModelId,
  ollamaCustomModels,
  setOllamaCustomModels,
  newOllamaModel,
  setNewOllamaModel,
  handleAddOllamaModel,
  handleRemoveOllamaModel,
  handleEditOllamaModel,
  // OpenAI-compatible instances
  openaiCompatibleInstances,
  setOpenaiCompatibleInstances,
  newInstance,
  setNewInstance,
  handleAddInstance,
  handleRemoveInstance,
  handleUpdateInstance,
  handleUpdateInstanceModel,
  handleAddInstanceModel,
  handleRemoveInstanceModel,
  selectedInstanceId,
  setSelectedInstanceId,
  newModel,
  setNewModel,
}: ProviderSettingsProps) {
  return (
    <>
      {provider === 'anthropic' && (
        <AnthropicSettings 
          anthropicApiKey={anthropicApiKey}
          setAnthropicApiKey={setAnthropicApiKey}
          anthropicBaseUrl={anthropicBaseUrl}
          setAnthropicBaseUrl={setAnthropicBaseUrl}
          thinkingBudgetTokens={thinkingBudgetTokens}
          setThinkingBudgetTokens={setThinkingBudgetTokens}
        />
      )}
      
      {provider === 'openai' && (
        <OpenAISettings 
          openaiApiKey={openaiApiKey}
          setOpenaiApiKey={setOpenaiApiKey}
          openaiBaseUrl={openaiBaseUrl}
          setOpenaiBaseUrl={setOpenaiBaseUrl}
        />
      )}
      
      {provider === 'gemini' && (
        <GeminiSettings 
          geminiApiKey={geminiApiKey}
          setGeminiApiKey={setGeminiApiKey}
          geminiBaseUrl={geminiBaseUrl}
          setGeminiBaseUrl={setGeminiBaseUrl}
        />
      )}
      
      {provider === 'ollama' && (
        <OllamaSettings 
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
          />
        );
      })()}
    </>
  );
}
