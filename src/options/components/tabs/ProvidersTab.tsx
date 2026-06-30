import React, { useState, useEffect } from 'react';
import { OllamaModel } from '../OllamaModelList';
import { ProviderCardGrid } from '../ProviderCardGrid';
import { ProviderSettings } from '../ProviderSettings';
import { SaveButton } from '../SaveButton';
import { ModelPricingTable } from '../ModelPricingTable';
import { OpenAICompatibleInstance } from '../../../models/providers/openai-compatible';
import { OpenAICompatibleInstanceManager } from '../OpenAICompatibleInstanceManager';
import { useLanguage } from '../../LanguageContext';

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
  const { t } = useLanguage();
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

  const configFileInputRef = React.useRef<HTMLInputElement>(null);
  const [configExportStatus, setConfigExportStatus] = useState("");
  const [configImportStatus, setConfigImportStatus] = useState("");

  const handleExportConfig = () => {
    try {
      setConfigExportStatus("Exporting...");
      const configData = {
        provider,
        anthropicApiKey,
        anthropicBaseUrl,
        thinkingBudgetTokens,
        openaiApiKey,
        openaiBaseUrl,
        geminiApiKey,
        geminiBaseUrl,
        ollamaApiKey,
        ollamaBaseUrl,
        ollamaModelId,
        ollamaCustomModels,
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
          if (config.anthropicApiKey !== undefined) setAnthropicApiKey(config.anthropicApiKey);
          if (config.anthropicBaseUrl !== undefined) setAnthropicBaseUrl(config.anthropicBaseUrl);
          if (config.thinkingBudgetTokens !== undefined) setThinkingBudgetTokens(config.thinkingBudgetTokens);
          if (config.openaiApiKey !== undefined) setOpenaiApiKey(config.openaiApiKey);
          if (config.openaiBaseUrl !== undefined) setOpenaiBaseUrl(config.openaiBaseUrl);
          if (config.geminiApiKey !== undefined) setGeminiApiKey(config.geminiApiKey);
          if (config.geminiBaseUrl !== undefined) setGeminiBaseUrl(config.geminiBaseUrl);
          if (config.ollamaApiKey !== undefined) setOllamaApiKey(config.ollamaApiKey);
          if (config.ollamaBaseUrl !== undefined) setOllamaBaseUrl(config.ollamaBaseUrl);
          if (config.ollamaModelId !== undefined) setOllamaModelId(config.ollamaModelId);
          if (config.ollamaCustomModels !== undefined) setOllamaCustomModels(config.ollamaCustomModels);
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
          {showCompatManager && !provider.startsWith('openai-compatible:') && (
            <div className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold">{t('OpenAI Compatible Instances')}</h3>
                <button className="btn btn-sm btn-ghost" onClick={handleCloseCompatManager}>
                  {t('Close ✕')}
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
