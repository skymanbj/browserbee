import React from 'react';
import { OpenAICompatibleInstance } from '../../models/providers/openai-compatible';
import { OllamaModel } from './OllamaModelList';
import { ProviderSelector } from './ProviderSelector';
import { ProviderSettings } from './ProviderSettings';
import { SaveButton } from './SaveButton';

interface LLMProviderConfigProps {
  // Provider selection
  provider: string;
  setProvider: (provider: string) => void;

  // Anthropic settings
  anthropicApiKey: string;
  setAnthropicApiKey: (key: string) => void;
  anthropicBaseUrl: string;
  setAnthropicBaseUrl: (url: string) => void;
  anthropicModelId: string;
  setAnthropicModelId: (id: string) => void;
  thinkingBudgetTokens: number;
  setThinkingBudgetTokens: (tokens: number) => void;

  // OpenAI settings
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
  openaiBaseUrl: string;
  setOpenaiBaseUrl: (url: string) => void;
  openaiModelId: string;
  setOpenaiModelId: (id: string) => void;

  // Gemini settings
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  geminiBaseUrl: string;
  setGeminiBaseUrl: (url: string) => void;
  geminiModelId: string;
  setGeminiModelId: (id: string) => void;

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

  // Save functionality
  isSaving: boolean;
  saveStatus: string;
  handleSave: () => void;
}

export function LLMProviderConfig({
  provider,
  setProvider,
  anthropicApiKey,
  setAnthropicApiKey,
  anthropicBaseUrl,
  setAnthropicBaseUrl,
  anthropicModelId,
  setAnthropicModelId,
  thinkingBudgetTokens,
  setThinkingBudgetTokens,
  openaiApiKey,
  setOpenaiApiKey,
  openaiBaseUrl,
  setOpenaiBaseUrl,
  openaiModelId,
  setOpenaiModelId,
  geminiApiKey,
  setGeminiApiKey,
  geminiBaseUrl,
  setGeminiBaseUrl,
  geminiModelId,
  setGeminiModelId,
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
  isSaving,
  saveStatus,
  handleSave
}: LLMProviderConfigProps) {
  return (
    <div className="card bg-base-100 shadow-md mb-6">
      <div className="card-body">
        <h2 className="card-title text-xl">LLM Provider Configuration</h2>
        <p className="mb-4">
          Configure your preferred LLM provider and API settings.
          Your API keys are stored securely in your browser's storage.
        </p>

        {/* Provider Selector */}
        <ProviderSelector
          provider={provider}
          setProvider={setProvider}
          openaiCompatibleInstances={openaiCompatibleInstances}
        />

        {/* Provider-specific Settings */}
        <ProviderSettings
          provider={provider}
          anthropicApiKey={anthropicApiKey}
          setAnthropicApiKey={setAnthropicApiKey}
          anthropicBaseUrl={anthropicBaseUrl}
          setAnthropicBaseUrl={setAnthropicBaseUrl}
          anthropicModelId={anthropicModelId}
          setAnthropicModelId={setAnthropicModelId}
          thinkingBudgetTokens={thinkingBudgetTokens}
          setThinkingBudgetTokens={setThinkingBudgetTokens}
          openaiApiKey={openaiApiKey}
          setOpenaiApiKey={setOpenaiApiKey}
          openaiBaseUrl={openaiBaseUrl}
          setOpenaiBaseUrl={setOpenaiBaseUrl}
          openaiModelId={openaiModelId}
          setOpenaiModelId={setOpenaiModelId}
          geminiApiKey={geminiApiKey}
          setGeminiApiKey={setGeminiApiKey}
          geminiBaseUrl={geminiBaseUrl}
          setGeminiBaseUrl={setGeminiBaseUrl}
          geminiModelId={geminiModelId}
          setGeminiModelId={setGeminiModelId}
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
        />

        <SaveButton
          isSaving={isSaving}
          saveStatus={saveStatus}
          handleSave={handleSave}
          isDisabled={
            (provider === 'anthropic' && !anthropicApiKey.trim()) ||
            (provider === 'openai' && !openaiApiKey.trim()) ||
            (provider === 'gemini' && !geminiApiKey.trim())
          }
        />
      </div>
    </div>
  );
}
