import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { OllamaProvider, OllamaProviderOptions } from './ollama';
import { OpenAIProvider } from './openai';
import { OpenAICompatibleProvider, OpenAICompatibleProviderOptions, OpenAICompatibleInstance } from './openai-compatible';
import { LLMProvider, ProviderOptions } from './types';

export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'openai-compatible' | `openai-compatible:${string}`;

function isOpenAICompatibleProvider(provider: string): provider is 'openai-compatible' | `openai-compatible:${string}` {
  return provider === 'openai-compatible' || provider.startsWith('openai-compatible:');
}

function extractInstanceId(provider: string): string {
  const parts = provider.split(':');
  return parts.length > 1 ? parts.slice(1).join(':') : '';
}

export async function createProvider(
  provider: ProviderId,
  options: ProviderOptions | OpenAICompatibleProviderOptions
): Promise<LLMProvider> {
  if (isOpenAICompatibleProvider(provider)) {
    const instanceId = extractInstanceId(provider);
    const localRes = typeof chrome !== 'undefined' && chrome.storage?.local ? await chrome.storage.local.get({ openaiCompatibleInstances: null }) : { openaiCompatibleInstances: null };
    let instances: OpenAICompatibleInstance[] = localRes.openaiCompatibleInstances;
    if (!instances || !Array.isArray(instances)) {
      const syncRes = typeof chrome !== 'undefined' && chrome.storage?.sync ? await chrome.storage.sync.get({ openaiCompatibleInstances: [] }) : { openaiCompatibleInstances: [] };
      instances = syncRes.openaiCompatibleInstances || [];
    }
    const instance = instances.find((inst: OpenAICompatibleInstance) => inst.id === instanceId);
    if (!instance) {
      // Fallback for tests or when no instance is configured yet but options are provided
      if (options && (options.apiKey || options.baseUrl)) {
        return new OpenAICompatibleProvider({
          apiKey: options.apiKey,
          baseUrl: options.baseUrl,
          apiModelId: options.apiModelId,
          openaiCompatibleModels: (options as any).openaiCompatibleModels || [],
          dangerouslyAllowBrowser: true,
        } as OpenAICompatibleProviderOptions);
      }
      throw new Error(`OpenAI-compatible instance "${instanceId}" not found. Please configure it in the extension options.`);
    }
    return new OpenAICompatibleProvider({
      apiKey: instance.apiKey,
      baseUrl: instance.baseUrl,
      apiModelId: instance.modelId,
      openaiCompatibleModels: instance.models || [],
      dangerouslyAllowBrowser: true,
    } as OpenAICompatibleProviderOptions);
  }

  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider(options);
    case 'openai':
      return new OpenAIProvider(options);
    case 'gemini':
      return new GeminiProvider(options);
    case 'ollama':
      {
        const ollamaCustomModels = await chrome.storage.sync.get({ ollamaCustomModels: [] });
        return new OllamaProvider({
          ...options,
          ollamaCustomModels: ollamaCustomModels.ollamaCustomModels || []
        } as OllamaProviderOptions);
      }
    default:
      throw new Error(`Provider ${provider} not supported`);
  }
}
