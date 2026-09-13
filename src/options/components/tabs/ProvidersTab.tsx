import React, { useEffect, useState } from 'react';
import { OpenAICompatibleInstance } from '../../../models/providers/openai-compatible';
import { useAppSelector } from '../../../store/hooks';
import { ModelPricingTable } from '../ModelPricingTable';
import { ProviderCardGrid } from '../ProviderCardGrid';
import { ProviderSettings } from '../ProviderSettings';
import { SaveButton } from '../SaveButton';

export interface ProvidersTabProps {
  provider: string;
  setProvider: (value: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (value: string) => void;
  geminiBaseUrl: string;
  setGeminiBaseUrl: (value: string) => void;
  geminiModelId: string;
  setGeminiModelId: (value: string) => void;
  openaiCompatibleInstances: any[];
  setOpenaiCompatibleInstances: (value: any[]) => void;
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
  geminiApiKey,
  setGeminiApiKey,
  geminiBaseUrl,
  setGeminiBaseUrl,
  geminiModelId,
  setGeminiModelId,
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
  const language = useAppSelector((state: any) => state.settings.language);

  const t = (key: string): string => {
    const cleanKey = key.trim();
    const translationDict: Record<string, Record<string, string>> = {
      'LLM Provider Configuration': { zh: '大语言模型提供商配置', en: 'LLM Provider Configuration' },
      'Configure your preferred LLM provider and API settings. Your API keys are stored securely in your browser\'s storage.': {
        zh: '配置您首选的大语言模型提供商和 API 设置。您的 API 密钥安全地存储在浏览器的本地存储中。',
        en: 'Configure your preferred LLM provider and API settings. Your API keys are stored securely in your browser\'s storage.'
      },
      'Select Provider': { zh: '选择模型提供商', en: 'Select Provider' },
      'API Key': { zh: 'API 密钥', en: 'API Key' },
      'Base URL (Optional)': { zh: '自定义接口地址 (选填)', en: 'Base URL (Optional)' },
      'API Model ID': { zh: 'API 模型 ID', en: 'API Model ID' },
      'Backup & Restore': { zh: '备份与恢复', en: 'Backup & Restore' },
      'Export Models & Config': { zh: '导出模型与配置', en: 'Export Models & Config' },
      'Import Models & Config': { zh: '导入模型与配置', en: 'Import Models & Config' },
      'Import from Page Assist': { zh: '从 Page Assist 导入', en: 'Import from Page Assist' },
      'Model Price List': { zh: '模型价格列表', en: 'Model Price List' },
      'OpenAI Compatible Instances': { zh: 'OpenAI 兼容实例', en: 'OpenAI Compatible Instances' },
      'Close ✕': { zh: '关闭 ✕', en: 'Close ✕' },
      'Settings saved successfully!': { zh: '设置保存成功！', en: 'Settings saved successfully!' },
      'Saving...': { zh: '保存中...', en: 'Saving...' }
    };
    const translated = translationDict[cleanKey]?.[language];
    return translated ?? key;
  };
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newInstName, setNewInstName] = useState('');
  const [newInstUrl, setNewInstUrl] = useState('');
  const [newInstKey, setNewInstKey] = useState('');
  const [addingStatus, setAddingStatus] = useState<string | null>(null);
  const [isPullingNew, setIsPullingNew] = useState(false);

  // Link grid selection with detail form
  useEffect(() => {
    if (provider.startsWith('openai-compatible:')) {
      const instId = provider.split(':')[1];
      setSelectedInstanceId(instId);
      setIsAddingNew(false);
    } else {
      setIsAddingNew(false);
    }
  }, [provider, setSelectedInstanceId]);

  // Listen for the Add card click from grid
  useEffect(() => {
    const handler = () => {
      setIsAddingNew(true);
      setNewInstName('');
      setNewInstUrl('');
      setNewInstKey('');
      setAddingStatus(null);
      setTimeout(() => {
        document.getElementById('provider-settings-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    };
    window.addEventListener('browserbee:addOpenAICompatible', handler);
    return () => window.removeEventListener('browserbee:addOpenAICompatible', handler);
  }, []);

  // Switch back to default provider on deletion
  useEffect(() => {
    const handler = (e: any) => {
      const deletedId = e.detail?.id;
      if (provider === `openai-compatible:${deletedId}`) {
        setProvider('gemini');
      }
    };
    window.addEventListener('browserbee:deletedInstance', handler);
    return () => window.removeEventListener('browserbee:deletedInstance', handler);
  }, [provider, setProvider]);

  const handleCreateAndPull = async () => {
    setIsPullingNew(true);
    setAddingStatus(null);
    try {
      const name = newInstName.trim();
      const url = newInstUrl.trim();
      const key = newInstKey.trim();

      const safeId = name.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'custom';
      const uniqueId = `${safeId}-${Math.random().toString(36).substring(2, 6)}`;

      // Auto fetch models in background
      let fetchedModels: any[] = [];
      const formattedUrl = url.endsWith('/') ? url.slice(0, -1) : url;

      // 动态请求主机权限（扩展 options 页面需要 host_permission 才能 fetch 外部 API）
      try {
        const origin = new URL(formattedUrl).origin + '/*';
        const hasPermission = await chrome.permissions.contains({ origins: [origin] });
        if (!hasPermission) {
          const granted = await chrome.permissions.request({ origins: [origin] });
          if (!granted) {
            throw new Error(`需要授权访问 ${new URL(formattedUrl).hostname} 才能拉取模型列表`);
          }
        }
      } catch (permErr: any) {
        if (permErr.message?.includes('需要授权')) {
          throw permErr;
        }
        console.warn('Permission check skipped:', permErr);
      }

      // 智能构造多个候选模型列表 URL
      // 部分提供商（如商汤）的 baseUrl 已包含 /v1，需要避免重复拼接
      const hasV1 = /\/v1\/?$/.test(formattedUrl);
      const baseWithoutV1 = formattedUrl.replace(/\/v1\/?$/, '');
      const candidateUrls: string[] = [
        `${formattedUrl}/models`,
        `${formattedUrl}/v1/models`,
      ];
      if (hasV1) {
        candidateUrls.push(`${baseWithoutV1}/models`);
        candidateUrls.push(`${baseWithoutV1}/v1/models`);
      }
      for (const candidateUrl of candidateUrls) {
        try {
          const response = await fetch(candidateUrl, {
            headers: {
              'Content-Type': 'application/json',
              ...(key ? { 'Authorization': `Bearer ${key}` } : {})
            }
          });
          if (response.ok) {
            const data = await response.json();
            const list = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : null);
            if (list) {
              fetchedModels = list.map((m: any) => {
                const id = m.id || m.name || '';
                return {
                  id,
                  name: m.name || id,
                  isReasoningModel: id.toLowerCase().includes('reasoning') || id.toLowerCase().includes('deepseek-r1') || id.toLowerCase().includes('thought'),
                  contextWindow: 128000,
                  maxTokens: 4096
                };
              }).filter((m: any) => m.id);
              break; // 成功获取后退出循环
            }
          }
        } catch (fetchErr) {
          console.warn(`Failed to fetch models from ${candidateUrl}:`, fetchErr);
        }
      }

      const newInst = {
        id: uniqueId,
        name,
        apiKey: key,
        baseUrl: url,
        modelId: fetchedModels[0]?.id || '',
        models: fetchedModels
      };

      const updated = [...openaiCompatibleInstances, newInst];
      setOpenaiCompatibleInstances(updated);

      // Save directly to storage
      await chrome.storage.local.set({ openaiCompatibleInstances: updated });
      await chrome.storage.sync.set({ openaiCompatibleInstances: updated });

      setAddingStatus(t('添加并拉取模型成功！') + ` (${fetchedModels.length} models)`);

      // Select the new provider
      setProvider(`openai-compatible:${uniqueId}`);
      setIsAddingNew(false);
    } catch (err: any) {
      setAddingStatus(t('创建失败') + `: ${err.message || err}`);
    } finally {
      setIsPullingNew(false);
    }
  };

  const configFileInputRef = React.useRef<HTMLInputElement>(null);
  const [configExportStatus, setConfigExportStatus] = useState("");
  const [configImportStatus, setConfigImportStatus] = useState("");

  const handleExportConfig = () => {
    try {
      setConfigExportStatus("Exporting...");
      const configData = {
        provider,
        geminiApiKey,
        geminiBaseUrl,
        openaiCompatibleInstances,
      };
      const jsonData = JSON.stringify(configData, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().split("T")[0];
      const filename = `browserbee-config-${date}.json`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setConfigExportStatus("Exported successfully!");
      setTimeout(() => setConfigExportStatus(""), 3000);
    } catch (error) {
      setConfigExportStatus(`Error exporting: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      setConfigImportStatus("Importing...");
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const config = JSON.parse(content);

          if (typeof config !== 'object' || config === null) {
            throw new Error("Invalid format: Expected a JSON object");
          }

          if (config.provider !== undefined) setProvider(config.provider);
          if (config.geminiApiKey !== undefined) setGeminiApiKey(config.geminiApiKey);
          if (config.geminiBaseUrl !== undefined) setGeminiBaseUrl(config.geminiBaseUrl);
          if (config.openaiCompatibleInstances !== undefined) setOpenaiCompatibleInstances(config.openaiCompatibleInstances);

          setConfigImportStatus("Successfully imported! Click 'Save Settings' to apply changes.");
          setTimeout(() => setConfigImportStatus(""), 5000);
          if (configFileInputRef.current) {
            configFileInputRef.current.value = "";
          }
        } catch (error) {
          setConfigImportStatus(`Error parsing config file: ${error instanceof Error ? error.message : String(error)}`);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      setConfigImportStatus(`Error importing: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const triggerConfigFileInput = () => {
    if (configFileInputRef.current) {
      configFileInputRef.current.click();
    }
  };

  const [pageAssistProviders, setPageAssistProviders] = useState<any[]>([]);
  const pageAssistFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportPageAssistClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      setConfigImportStatus("Parsing Page Assist file...");
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const list = JSON.parse(content);
          if (!Array.isArray(list)) {
            throw new Error("Invalid Page Assist format: Expected a JSON array");
          }

          const mapped = list
            .filter(item => item && item.baseUrl && item.apiKey && item.name)
            .map(item => ({
              id: item.id || `pa-${Math.random().toString(36).substr(2, 9)}`,
              name: item.name,
              baseUrl: item.baseUrl,
              apiKey: item.apiKey,
              checked: true
            }));

          if (mapped.length === 0) {
            throw new Error("No valid providers found in the selected file.");
          }

          setPageAssistProviders(mapped);
          setConfigImportStatus(`Found ${mapped.length} providers. Select below to import.`);
          setTimeout(() => setConfigImportStatus(""), 3000);
        } catch (error) {
          setConfigImportStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
        if (pageAssistFileInputRef.current) {
          pageAssistFileInputRef.current.value = "";
        }
      };
      reader.readAsText(file);
    } catch (error) {
      setConfigImportStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleTogglePageAssistProvider = (id: string) => {
    setPageAssistProviders(prev => prev.map(p => p.id === id ? { ...p, checked: !p.checked } : p));
  };

  const renderAddNewForm = () => {
    return (
      <div className="border border-dashed border-primary rounded-lg p-6 mb-4 bg-primary/5">
        <div className="flex justify-between items-center mb-4 border-b border-primary/20 pb-2">
          <h3 className="font-bold text-base text-primary flex items-center gap-2">
            <span>➕</span> {t('新建自定义兼容服务')}
          </h3>
          <button type="button" className="btn btn-xs btn-ghost text-base-content/60" onClick={() => setIsAddingNew(false)}>
            {t('取消')}
          </button>
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-medium">{t('提供商名称')}:</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="e.g. DeepSeek, SiliconFlow, OpenRouter"
            value={newInstName}
            onChange={e => setNewInstName(e.target.value)}
          />
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-medium">{t('接口地址 (Base URL)')}:</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="e.g. https://api.deepseek.com/v1"
            value={newInstUrl}
            onChange={e => setNewInstUrl(e.target.value)}
          />
        </div>

        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-medium">{t('API 密钥 (API Key)')}:</span>
          </label>
          <input
            type="password"
            className="input input-bordered w-full"
            placeholder="Enter API Key"
            value={newInstKey}
            onChange={e => setNewInstKey(e.target.value)}
          />
        </div>

        {addingStatus && (
          <div className={`text-xs mb-4 font-medium ${addingStatus.includes('成功') || addingStatus.includes('success') ? 'text-success' : 'text-error'}`}>
            {addingStatus}
          </div>
        )}

        <button
          type="button"
          className={`btn btn-primary w-full ${isPullingNew ? 'loading' : ''}`}
          onClick={handleCreateAndPull}
          disabled={!newInstName.trim() || !newInstUrl.trim() || isPullingNew}
        >
          {isPullingNew ? t('正在自动拉取模型...') : `➕ ${t('添加并自动拉取模型')}`}
        </button>
      </div>
    );
  };

  const confirmImportPageAssist = () => {
    const selected = pageAssistProviders.filter(p => p.checked);
    if (selected.length === 0) {
      setConfigImportStatus("No providers selected.");
      return;
    }

    const newInstances: OpenAICompatibleInstance[] = selected.map(p => {
      let defaultModels = [{ id: 'default', name: 'Default Model', isReasoningModel: false, contextWindow: 0, maxTokens: 0 }];

      const url = p.baseUrl.toLowerCase();
      if (url.includes('siliconflow')) {
        defaultModels = [
          { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', isReasoningModel: false, contextWindow: 64000, maxTokens: 4096 },
          { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1 (Reasoning)', isReasoningModel: true, contextWindow: 64000, maxTokens: 8192 },
          { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', isReasoningModel: false, contextWindow: 32000, maxTokens: 4096 }
        ];
      } else if (url.includes('openrouter')) {
        defaultModels = [
          { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', isReasoningModel: false, contextWindow: 128000, maxTokens: 8192 },
          { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', isReasoningModel: false, contextWindow: 128000, maxTokens: 4096 },
          { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', isReasoningModel: false, contextWindow: 200000, maxTokens: 8192 }
        ];
      }

      return {
        id: p.id,
        name: p.name,
        apiKey: p.apiKey,
        baseUrl: p.baseUrl,
        modelId: defaultModels[0].id,
        models: defaultModels
      };
    });

    const currentInstances = [...openaiCompatibleInstances];
    newInstances.forEach(newInst => {
      const idx = currentInstances.findIndex(inst => inst.id === newInst.id || (inst.baseUrl === newInst.baseUrl && inst.name === newInst.name));
      if (idx >= 0) {
        currentInstances[idx] = newInst;
      } else {
        currentInstances.push(newInst);
      }
    });

    setOpenaiCompatibleInstances(currentInstances);
    setPageAssistProviders([]);
    setConfigImportStatus(`Successfully imported ${selected.length} providers! Click 'Save Settings' to apply.`);
    setTimeout(() => setConfigImportStatus(""), 5000);
  };

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-xl">{t('LLM Provider Configuration')}</h2>
          <p className="mb-4 text-base-content/70 text-sm">
            {t("Configure your preferred LLM provider and API settings. Your API keys are stored securely in your browser's storage.")}
          </p>

          {/* Provider Card Grid */}
          <ProviderCardGrid
            provider={provider}
            setProvider={setProvider}
            openaiCompatibleInstances={openaiCompatibleInstances}
            handleRemoveInstance={handleRemoveInstance}
          />

          {/* Provider-specific Settings */}
          <div id="provider-settings-section">
            {isAddingNew ? (
              renderAddNewForm()
            ) : (
              <ProviderSettings
                provider={provider}
                geminiApiKey={geminiApiKey}
                setGeminiApiKey={setGeminiApiKey}
                geminiBaseUrl={geminiBaseUrl}
                setGeminiBaseUrl={setGeminiBaseUrl}
                geminiModelId={geminiModelId}
                setGeminiModelId={setGeminiModelId}
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
            )}
          </div>

          <SaveButton
            isSaving={isSaving}
            saveStatus={saveStatus}
            handleSave={handleSave}
            isDisabled={
              (provider === 'gemini' && !geminiApiKey.trim())
            }
          />

          <div className="divider mt-6">{t('Backup & Restore')}</div>

          {pageAssistProviders.length > 0 && (
            <div className="card bg-base-200 p-4 mb-4 border border-primary/20">
              <h3 className="font-bold text-sm mb-2 text-primary">选择要导入的 Page Assist 提供商：</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4 bg-base-100 p-2 rounded border">
                {pageAssistProviders.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-base-200 rounded px-1">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs checkbox-primary"
                      checked={p.checked}
                      onChange={() => handleTogglePageAssistProvider(p.id)}
                    />
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-gray-500">({p.baseUrl})</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm" onClick={confirmImportPageAssist}>
                  确认导入所选 ({pageAssistProviders.filter(p => p.checked).length} 个)
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setPageAssistProviders([])}>
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 items-center">
            <button className="btn btn-outline btn-sm" onClick={handleExportConfig}>
              {t('Export Models & Config')}
            </button>
            <button className="btn btn-outline btn-sm" onClick={triggerConfigFileInput}>
              {t('Import Models & Config')}
            </button>
            <button className="btn btn-outline btn-primary btn-sm" onClick={() => pageAssistFileInputRef.current?.click()}>
              {t('Import from Page Assist')}
            </button>
            <input
              type="file"
              ref={configFileInputRef}
              onChange={handleImportConfig}
              accept=".json"
              className="hidden"
            />
            <input
              type="file"
              ref={pageAssistFileInputRef}
              onChange={handleImportPageAssistClick}
              accept=".json"
              className="hidden"
            />
          </div>
          {configExportStatus && (
            <div className={`alert ${configExportStatus.includes('Error') ? 'alert-error' : 'alert-success'} py-2 mt-2 text-sm`}>
              {configExportStatus}
            </div>
          )}
          {configImportStatus && (
            <div className={`alert ${configImportStatus.includes('Error') ? 'alert-error' : 'alert-success'} py-2 mt-2 text-sm`}>
              {configImportStatus}
            </div>
          )}
        </div>
      </div>

      {/* Model Pricing Table */}
      <ModelPricingTable getModelPricingData={getModelPricingData} />
    </div>
  );
}
