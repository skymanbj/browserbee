import React from 'react';
import { ModelList, Model } from './ModelList';

interface OpenAICompatibleSettingsProps {
  instanceName: string;
  setInstanceName: (name: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  modelId: string;
  setModelId: (id: string) => void;
  models: Model[];
  setModels: (models: Model[]) => void;
  newModel: { id: string; name: string; isReasoningModel: boolean; contextWindow: number; maxTokens: number };
  setNewModel: React.Dispatch<React.SetStateAction<{ id: string; name: string; isReasoningModel: boolean; contextWindow: number; maxTokens: number }>>;
  handleAddModel: () => void;
  handleRemoveModel: (id: string) => void;
  handleEditModel: (idx: number, field: string, value: any) => void;
}

export function OpenAICompatibleSettings({
  instanceName,
  setInstanceName,
  apiKey,
  setApiKey,
  baseUrl,
  setBaseUrl,
  modelId,
  setModelId,
  models,
  setModels,
  newModel,
  setNewModel,
  handleAddModel,
  handleRemoveModel,
  handleEditModel
}: OpenAICompatibleSettingsProps) {
  return (
    <div className="border rounded-lg p-4 mb-4">
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Instance Name:</span>
        </label>
        <input
          type="text"
          value={instanceName}
          onChange={e => setInstanceName(e.target.value)}
          placeholder="e.g. DeepSeek, SiliconFlow, GLM"
          className="input input-bordered w-full"
        />
      </div>
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">API Key:</span>
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Enter your API key"
          className="input input-bordered w-full"
        />
      </div>
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">Base URL:</span>
        </label>
        <input
          type="text"
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          placeholder="e.g. https://api.deepseek.com/v1"
          className="input input-bordered w-full"
        />
        <label className="label">
          <span className="label-text-alt">The API endpoint URL (must be OpenAI-compatible)</span>
        </label>
      </div>
      
      <ModelList
        models={models}
        setModels={setModels}
        newModel={newModel}
        setNewModel={setNewModel}
        handleAddModel={handleAddModel}
        handleRemoveModel={handleRemoveModel}
        handleEditModel={handleEditModel}
      />
      
      {models.length > 0 && (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Current Model:</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={modelId}
            onChange={e => setModelId(e.target.value)}
          >
            <option value="">Select a model</option>
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
