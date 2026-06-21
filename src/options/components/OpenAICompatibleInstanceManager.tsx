import React, { useState } from 'react';
import { OpenAICompatibleInstance } from '../../models/providers/openai-compatible';
import { OpenAICompatibleSettings } from './OpenAICompatibleSettings';
import { Model } from './ModelList';

interface OpenAICompatibleInstanceManagerProps {
  instances: OpenAICompatibleInstance[];
  setInstances: (instances: OpenAICompatibleInstance[]) => void;
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

export function OpenAICompatibleInstanceManager({
  instances,
  setInstances,
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
}: OpenAICompatibleInstanceManagerProps) {
  const selectedInstance = instances.find(inst => inst.id === selectedInstanceId) || null;

  const handleEditModel = (idx: number, field: string, value: any) => {
    if (selectedInstanceId) {
      handleUpdateInstanceModel(selectedInstanceId, idx, field, value);
    }
  };

  const handleAddModel = () => {
    if (selectedInstanceId) {
      handleAddInstanceModel(selectedInstanceId);
    }
  };

  const handleRemoveModel = (modelId: string) => {
    if (selectedInstanceId) {
      handleRemoveInstanceModel(selectedInstanceId, modelId);
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-4">
      <h3 className="font-bold mb-2">OpenAI Compatible Instances</h3>
      <p className="text-sm mb-4">
        Configure multiple OpenAI-compatible API services (DeepSeek, SiliconFlow, GLM, Qwen, etc.). 
        Each instance has its own API key, base URL, and model list.
      </p>

      <div className="flex gap-4">
        <div className="w-1/3">
          <div className="mb-2">
            <div className="flex gap-2 mb-2">
              <input
                className="input input-bordered input-sm flex-1"
                value={newInstance.id}
                onChange={e => setNewInstance({ ...newInstance, id: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
                placeholder="Instance ID (e.g. deepseek)"
              />
              <input
                className="input input-bordered input-sm flex-1"
                value={newInstance.name}
                onChange={e => setNewInstance({ ...newInstance, name: e.target.value })}
                placeholder="Display Name"
              />
            </div>
            <button
              className="btn btn-sm btn-primary w-full"
              onClick={handleAddInstance}
              disabled={!newInstance.id.trim() || !newInstance.name.trim()}
            >
              Add Instance
            </button>
          </div>

          <ul className="menu bg-base-200 rounded-box w-full">
            {instances.length === 0 && (
              <li className="text-sm text-gray-500 p-2">No instances configured. Add one above.</li>
            )}
            {instances.map(inst => (
              <li key={inst.id}>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`cursor-pointer flex-1 ${selectedInstanceId === inst.id ? 'font-bold text-primary' : ''}`}
                    onClick={() => setSelectedInstanceId(inst.id)}
                  >
                    {inst.name}
                    <span className="text-xs text-gray-500 ml-1">({inst.id})</span>
                  </span>
                  <button
                    className="btn btn-xs btn-ghost btn-circle text-error"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete instance "${inst.name}"?`)) {
                        handleRemoveInstance(inst.id);
                        if (selectedInstanceId === inst.id) {
                          setSelectedInstanceId(null);
                        }
                      }
                    }}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1">
          {selectedInstance ? (
            <OpenAICompatibleSettings
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
              handleAddModel={handleAddModel}
              handleRemoveModel={handleRemoveModel}
              handleEditModel={handleEditModel}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              {instances.length > 0 
                ? 'Select an instance to edit its settings'
                : 'Add an instance to get started'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
