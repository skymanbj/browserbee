import React, { useState } from 'react';
import { ModelList, Model } from './ModelList';
import { useLanguage } from '../LanguageContext';

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
  const { t } = useLanguage();
  const [pulling, setPulling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleAutoPull = async () => {
    if (!baseUrl) {
      setStatus(t('请先填写 Base URL'));
      return;
    }
    setPulling(true);
    setStatus(null);
    try {
      const url = baseUrl.trim();
      const formattedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }
      
      const response = await fetch(`${formattedUrl}/models`, {
        headers
      });
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      const data = await response.json();
      const modelList = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : null);
      
      if (modelList) {
        const fetched: Model[] = modelList.map((m: any) => {
          const id = m.id || m.name || '';
          return {
            id,
            name: m.name || id,
            isReasoningModel: id.toLowerCase().includes('reasoning') || id.toLowerCase().includes('deepseek-r1') || id.toLowerCase().includes('thought'),
            contextWindow: 128000,
            maxTokens: 4096
          };
        }).filter((m: any) => m.id);

        if (fetched.length === 0) {
          setStatus(t('未从服务器获取到任何模型'));
          return;
        }

        const merged = [...models];
        let addedCount = 0;
        for (const item of fetched) {
          if (!merged.some(m => m.id === item.id)) {
            merged.push(item);
            addedCount++;
          }
        }
        
        setModels(merged);
        setStatus(t('Models pulled successfully!') + ` (${fetched.length} models, +${addedCount} new)`);
        
        if (!modelId && fetched.length > 0) {
          setModelId(fetched[0].id);
        }
      } else {
        throw new Error('Could not find data array in response');
      }
    } catch (err: any) {
      console.error(err);
      setStatus(t('Failed to pull models') + `: ${err.message || err}`);
    } finally {
      setPulling(false);
    }
  };

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
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            className={`btn btn-xs btn-outline ${pulling ? 'loading' : ''}`}
            onClick={handleAutoPull}
            disabled={pulling}
          >
            📥 {pulling ? t('Auto-pulling...') : t('Auto-pull Models')}
          </button>
        </div>
        {status && (
          <div className={`text-xs mt-1.5 ${status.includes('successfully') || status.includes('成功') ? 'text-success font-medium' : 'text-error'}`}>
            {status}
          </div>
        )}
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
