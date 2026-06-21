import { AnthropicProvider } from '../models/providers/anthropic';
import { GeminiProvider } from '../models/providers/gemini';
import { OllamaProvider, OllamaProviderOptions } from '../models/providers/ollama';
import { OpenAIProvider } from '../models/providers/openai';
import { OpenAICompatibleProvider, OpenAICompatibleInstance } from '../models/providers/openai-compatible';

export interface ProviderConfig {
  provider: 'anthropic' | 'openai' | 'gemini' | 'ollama' | `openai-compatible:${string}`;
  apiKey: string;
  apiModelId?: string;
  baseUrl?: string;
  thinkingBudgetTokens?: number;
  openaiCompatibleModels?: Array<{ id: string; name: string; isReasoningModel?: boolean; contextWindow?: number; maxTokens?: number }>;
  instanceId?: string;
}

export class ConfigManager {
  private static instance: ConfigManager;
  
  private constructor() {}
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  async getOpenAICompatibleInstances(): Promise<OpenAICompatibleInstance[]> {
    const result = await chrome.storage.sync.get({ openaiCompatibleInstances: [] });
    return (result.openaiCompatibleInstances || []) as OpenAICompatibleInstance[];
  }

  async migrateOpenAICompatibleData(): Promise<void> {
    const result = await chrome.storage.sync.get({
      openaiCompatibleInstances: null as OpenAICompatibleInstance[] | null,
      openaiCompatibleApiKey: '',
      openaiCompatibleBaseUrl: '',
      openaiCompatibleModelId: '',
      openaiCompatibleModels: [] as any[],
      provider: 'anthropic',
    });

    if (result.openaiCompatibleInstances !== null && Array.isArray(result.openaiCompatibleInstances)) {
      return;
    }

    const hasOldData = result.openaiCompatibleApiKey || result.openaiCompatibleBaseUrl || (result.openaiCompatibleModels && result.openaiCompatibleModels.length > 0);

    if (hasOldData) {
      const instances: OpenAICompatibleInstance[] = [{
        id: 'default',
        name: 'OpenAI Compatible',
        apiKey: result.openaiCompatibleApiKey || '',
        baseUrl: result.openaiCompatibleBaseUrl || '',
        modelId: result.openaiCompatibleModelId || '',
        models: (result.openaiCompatibleModels || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          isReasoningModel: m.isReasoningModel || false,
          contextWindow: m.contextWindow || 0,
          maxTokens: m.maxTokens || 0,
        })),
      }];

      await chrome.storage.sync.set({ openaiCompatibleInstances: instances });

      if (result.provider === 'openai-compatible') {
        await chrome.storage.sync.set({ provider: 'openai-compatible:default' });
      }

      await chrome.storage.sync.remove([
        'openaiCompatibleApiKey',
        'openaiCompatibleBaseUrl',
        'openaiCompatibleModelId',
        'openaiCompatibleModels',
      ]);
    } else {
      await chrome.storage.sync.set({ openaiCompatibleInstances: [] });
    }
  }
  
  async getProviderConfig(): Promise<ProviderConfig> {
    await this.migrateOpenAICompatibleData();

    const result = await chrome.storage.sync.get({
      provider: 'anthropic',
      anthropicApiKey: '',
      anthropicModelId: 'claude-3-7-sonnet-20250219',
      anthropicBaseUrl: '',
      openaiApiKey: '',
      openaiModelId: 'gpt-4o',
      openaiBaseUrl: '',
      geminiApiKey: '',
      geminiModelId: 'gemini-1.5-pro',
      geminiBaseUrl: '',
      ollamaApiKey: '',
      ollamaModelId: '',
      ollamaBaseUrl: '',
      thinkingBudgetTokens: 0,
      openaiCompatibleInstances: [] as OpenAICompatibleInstance[],
    });
    
    const provider = result.provider as string;

    if (provider.startsWith('openai-compatible:')) {
      const instanceId = provider.substring('openai-compatible:'.length);
      const instances = (result.openaiCompatibleInstances || []) as OpenAICompatibleInstance[];
      const instance = instances.find((inst: OpenAICompatibleInstance) => inst.id === instanceId);
      if (instance) {
        return {
          provider: provider as `openai-compatible:${string}`,
          apiKey: instance.apiKey,
          apiModelId: instance.modelId,
          baseUrl: instance.baseUrl,
          openaiCompatibleModels: instance.models || [],
          instanceId: instance.id,
        };
      }
      return {
        provider: 'anthropic',
        apiKey: result.anthropicApiKey,
        apiModelId: result.anthropicModelId,
        baseUrl: result.anthropicBaseUrl,
        thinkingBudgetTokens: result.thinkingBudgetTokens,
      };
    }

    switch (provider) {
      case 'anthropic':
        return {
          provider: 'anthropic',
          apiKey: result.anthropicApiKey,
          apiModelId: result.anthropicModelId,
          baseUrl: result.anthropicBaseUrl,
          thinkingBudgetTokens: result.thinkingBudgetTokens,
        };
      case 'openai':
        return {
          provider: 'openai',
          apiKey: result.openaiApiKey,
          apiModelId: result.openaiModelId,
          baseUrl: result.openaiBaseUrl,
        };
      case 'gemini':
        return {
          provider: 'gemini',
          apiKey: result.geminiApiKey,
          apiModelId: result.geminiModelId,
          baseUrl: result.geminiBaseUrl,
        };
      case 'ollama':
        return {
          provider: 'ollama',
          apiKey: result.ollamaApiKey,
          apiModelId: result.ollamaModelId,
          baseUrl: result.ollamaBaseUrl,
        };
      default:
        return {
          provider: 'anthropic',
          apiKey: result.anthropicApiKey,
          apiModelId: result.anthropicModelId,
          baseUrl: result.anthropicBaseUrl,
          thinkingBudgetTokens: result.thinkingBudgetTokens,
        };
    }
  }
  
  async saveProviderConfig(config: Partial<ProviderConfig>): Promise<void> {
    await chrome.storage.sync.set(config);
  }
  
  async getConfiguredProviders(): Promise<string[]> {
    await this.migrateOpenAICompatibleData();

    const result = await chrome.storage.sync.get({
      anthropicApiKey: '',
      openaiApiKey: '',
      geminiApiKey: '',
      ollamaApiKey: '',
      openaiCompatibleInstances: [] as OpenAICompatibleInstance[],
    });
    
    const providers: string[] = [];
    if (result.anthropicApiKey) providers.push('anthropic');
    if (result.openaiApiKey) providers.push('openai');
    if (result.geminiApiKey) providers.push('gemini');
    
    const ollamaBaseUrl = await this.getOllamaBaseUrl();
    const ollamaResult = await chrome.storage.sync.get({ ollamaCustomModels: [] });
    if (ollamaBaseUrl && ollamaResult.ollamaCustomModels.length > 0) {
      providers.push('ollama');
    }
    
    const instances = (result.openaiCompatibleInstances || []) as OpenAICompatibleInstance[];
    for (const instance of instances) {
      if (instance.apiKey && instance.models && instance.models.length > 0) {
        providers.push(`openai-compatible:${instance.id}`);
      }
    }
    
    return providers;
  }
  
  async getModelsForProvider(provider: string): Promise<{id: string, name: string}[]> {
    if (provider.startsWith('openai-compatible:')) {
      const instanceId = provider.substring('openai-compatible:'.length);
      const instances = await this.getOpenAICompatibleInstances();
      const instance = instances.find((inst: OpenAICompatibleInstance) => inst.id === instanceId);
      if (instance) {
        return OpenAICompatibleProvider.getAvailableModels({ openaiCompatibleModels: instance.models || [] } as any);
      }
      return [];
    }

    switch (provider) {
      case 'anthropic':
        return AnthropicProvider.getAvailableModels();
      case 'openai':
        return OpenAIProvider.getAvailableModels();
      case 'gemini':
        return GeminiProvider.getAvailableModels();
      case 'ollama': {
        const result = await chrome.storage.sync.get({ ollamaCustomModels: [] });
        const models = OllamaProvider.getAvailableModels({ ollamaCustomModels: result.ollamaCustomModels } as OllamaProviderOptions);
        return models;
      }
      default:
        return [];
    }
  }
  
  async getOllamaBaseUrl(): Promise<string> {
    const result = await chrome.storage.sync.get({
      ollamaBaseUrl: '',
    });
    return result.ollamaBaseUrl;
  }
  
  async updateProviderAndModel(provider: string, modelId: string): Promise<void> {
    await chrome.storage.sync.set({ provider });
    
    if (provider.startsWith('openai-compatible:')) {
      const instanceId = provider.substring('openai-compatible:'.length);
      const instances = await this.getOpenAICompatibleInstances();
      const updatedInstances = instances.map((inst: OpenAICompatibleInstance) =>
        inst.id === instanceId ? { ...inst, modelId } : inst
      );
      await chrome.storage.sync.set({ openaiCompatibleInstances: updatedInstances });
      return;
    }

    switch (provider) {
      case 'anthropic':
        await chrome.storage.sync.set({ anthropicModelId: modelId });
        break;
      case 'openai':
        await chrome.storage.sync.set({ openaiModelId: modelId });
        break;
      case 'gemini':
        await chrome.storage.sync.set({ geminiModelId: modelId });
        break;
      case 'ollama':
        await chrome.storage.sync.set({ ollamaModelId: modelId });
        break;
    }
  }
}
