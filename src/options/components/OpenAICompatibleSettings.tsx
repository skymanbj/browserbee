import React, { useState } from 'react';
import { ModelList, Model } from './ModelList';
import { useLanguage } from '../LanguageContext';

interface OpenAICompatibleSettingsProps {
  instanceId: string;
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
  handleRemoveInstance?: (id: string) => void;
}

export function OpenAICompatibleSettings({
  instanceId,
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
  handleEditModel,
  handleRemoveInstance
}: OpenAICompatibleSettingsProps) {
  const { t } = useLanguage();
  const [pulling, setPulling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState('');

  const filteredModels = models.filter(m => 
    m.id.toLowerCase().includes(modelSearch.toLowerCase()) || 
    m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

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
        
        const activeModelId = modelId || (fetched.length > 0 ? fetched[0].id : '');
        if (!modelId && fetched.length > 0) {
          setModelId(fetched[0].id);
        }

        // 立即自动写盘，防容量溢出且无需多点保存
        (async () => {
          try {
            const localResult = await chrome.storage.local.get({ openaiCompatibleInstances: [] });
            const currentInsts = localResult.openaiCompatibleInstances || [];
            const updatedInsts = currentInsts.map((inst: any) => 
              inst.id === instanceId ? { ...inst, models: merged, modelId: activeModelId } : inst
            );
            await chrome.storage.local.set({ openaiCompatibleInstances: updatedInsts });
            chrome.runtime.sendMessage({ action: 'providerConfigChanged' });
          } catch (storageErr) {
            console.error('Auto saving models failed:', storageErr);
          }
        })();
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
      {/* 砍掉繁琐的 ModelList，直接展示简洁的默认模型选择框 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text font-medium">{t('Current Model')}:</span>
        </label>
        {models.length > 0 ? (
          <>
            {/* 搜索过滤框 */}
            <div className="relative mb-2">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/40 text-xs" aria-hidden="true">🔍</span>
              <input
                type="text"
                className="input input-bordered input-xs w-full pl-7 text-xs"
                placeholder={t('搜索模型名称...')}
                value={modelSearch}
                onChange={e => setModelSearch(e.target.value)}
              />
            </div>
            
            <select
              className="select select-bordered w-full"
              value={modelId}
              onChange={e => setModelId(e.target.value)}
            >
              <option value="">{t('Select a model')}</option>
              {/* 如果当前选中的模型不在过滤列表中，强制追加在第一项显示，防止下拉框空白 */}
              {modelId && !filteredModels.some(m => m.id === modelId) && (
                <option value={modelId}>{modelId}</option>
              )}
              {filteredModels.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
              ))}
            </select>
          </>
        ) : (
          <div className="alert alert-warning text-xs py-2 px-3">
            <span>⚠️ {t('当前尚未自动拉取模型列表。请填写 Base URL 和 API Key 后，点击上方「自动拉取已下载模型/自动拉取模型列表」按钮一键获取模型。')}</span>
          </div>
        )}
      </div>
      
      {handleRemoveInstance && (
        <div className="mt-6 pt-4 border-t border-base-content/10 flex justify-end">
          <button
            type="button"
            className="btn btn-sm btn-error btn-outline gap-1.5"
            onClick={() => {
              if (confirm(t('确定要删除这个提供商吗？'))) {
                handleRemoveInstance(instanceId);
                // 派发事件让父组件切回内置默认提供商
                window.dispatchEvent(new CustomEvent('browserbee:deletedInstance', { detail: { id: instanceId } }));
              }
            }}
          >
            🗑️ {t('删除此提供商')}
          </button>
        </div>
      )}
    </div>
  );
}
