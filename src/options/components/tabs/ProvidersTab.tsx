import React, { useState, useEffect } from 'react';
import { OllamaModel } from '../OllamaModelList';
import { ProviderSelector } from '../ProviderSelector';
import { ProviderSettings } from '../ProviderSettings';
import { SaveButton } from '../SaveButton';
import { ModelPricingTable } from '../ModelPricingTable';
import { OpenAICompatibleInstance } from '../../../models/providers/openai-compatible';
import { OpenAICompatibleInstanceManager } from '../OpenAICompatibleInstanceManager';

interface ProvidersTabProps {
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

export function ProvidersTab({
  provider,
  setProvider,
  anthropicApiKey,
  setAnthropicApiKey,
  anthropicBaseUrl,
  setAnthropicBaseUrl,
  thinkingBudgetTokens,
  setThinkingBudgetTokens,
  openaiApiKey,
  setOpenaiApiKey,
  openaiBaseUrl,
  setOpenaiBaseUrl,
  geminiApiKey,
  setGeminiApiKey,
  geminiBaseUrl,
  setGeminiBaseUrl,
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
  handleSave,
  getModelPricingData,
}: ProvidersTabProps) {
  const [showCompatManager, setShowCompatManager] = useState(false);

  useEffect(() => {
    const handler = () => setShowCompatManager(true);
    window.addEventListener('browserbee:addOpenAICompatible', handler);
    return () => window.removeEventListener('browserbee:addOpenAICompatible', handler);
  }, []);

  // Notify ProviderSelector to reset its display when manager closes
  const handleCloseCompatManager = () => {
    setShowCompatManager(false);
    window.dispatchEvent(new CustomEvent('browserbee:closeOpenAICompatible'));
  };

  // Auto-show manager when an instance is selected
  useEffect(() => {
    if (provider.startsWith('openai-compatible:')) {
      setShowCompatManager(true);
    }
  }, [provider]);
  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow-md">
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
          />

          {/* OpenAI Compatible Instance Manager - shown when adding or editing */}
          {showCompatManager && (
            <div className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold">OpenAI Compatible Instances</h3>
                <button className="btn btn-sm btn-ghost" onClick={handleCloseCompatManager}>
                  Close ✕
                </button>
              </div>
              <OpenAICompatibleInstanceManager
              instances={openaiCompatibleInstances}
              setInstances={setOpenaiCompatibleInstances}
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
            </div>
          )}

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
      
      {/* Model Pricing Table */}
      <ModelPricingTable getModelPricingData={getModelPricingData} />
    </div>
  );
}
