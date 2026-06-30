import { ConfigManager } from "../background/configManager";
import { anthropicModels, openaiModels, geminiModels, ollamaModels } from "../models/models";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface WindowTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  currentProvider: string;
  currentModelId: string;
}

export class TokenTrackingService {
  private static instance: TokenTrackingService;

  // Map of windowId -> usage details
  private windowUsages: Map<number, WindowTokenUsage> = new Map();
  // Fallback default usage for cases where windowId is not provided
  private defaultUsage: WindowTokenUsage;

  // Provider and model tracking
  private configManager: ConfigManager;

  // Subscribers for UI updates
  private subscribers: (() => void)[] = [];

  private constructor() {
    this.configManager = ConfigManager.getInstance();
    this.defaultUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      currentProvider: 'anthropic',
      currentModelId: '',
    };
    this.initializeProviderConfig();
  }

  public static getInstance(): TokenTrackingService {
    if (!TokenTrackingService.instance) {
      TokenTrackingService.instance = new TokenTrackingService();
    }
    return TokenTrackingService.instance;
  }

  private async initializeProviderConfig() {
    try {
      const config = await this.configManager.getProviderConfig();
      this.defaultUsage.currentProvider = config.provider;
      this.defaultUsage.currentModelId = config.apiModelId || '';
      this.updateCostForUsage(this.defaultUsage);
    } catch (error) {
      console.error('Failed to get provider config:', error);
    }
  }

  private getWindowUsage(windowId?: number): WindowTokenUsage {
    if (windowId === undefined || windowId === null) {
      return this.defaultUsage;
    }
    if (!this.windowUsages.has(windowId)) {
      this.windowUsages.set(windowId, {
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        currentProvider: this.defaultUsage.currentProvider,
        currentModelId: this.defaultUsage.currentModelId,
      });
    }
    return this.windowUsages.get(windowId)!;
  }

  public trackInputTokens(tokens: number, cacheTokens?: { write?: number, read?: number }, windowId?: number): void {
    const usage = this.getWindowUsage(windowId);
    usage.inputTokens += tokens;

    // Add cache tokens to the total if provided
    if (cacheTokens) {
      if (cacheTokens.write) usage.inputTokens += cacheTokens.write;
      if (cacheTokens.read) usage.inputTokens += cacheTokens.read;
    }

    this.updateCostForUsage(usage);
    this.notifySubscribers(windowId);
  }

  public trackOutputTokens(tokens: number, windowId?: number): void {
    const usage = this.getWindowUsage(windowId);
    usage.outputTokens += tokens;
    this.updateCostForUsage(usage);
    this.notifySubscribers(windowId);
  }

  public getUsage(windowId?: number): TokenUsage {
    const usage = this.getWindowUsage(windowId);
    return {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cost: usage.cost
    };
  }

  public reset(windowId?: number): void {
    const usage = this.getWindowUsage(windowId);
    usage.inputTokens = 0;
    usage.outputTokens = 0;
    usage.cost = 0;
    this.notifySubscribers(windowId);
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  // Update provider and model information
  public updateProviderAndModel(provider: string, modelId: string, windowId?: number): void {
    const usage = this.getWindowUsage(windowId);
    usage.currentProvider = provider;
    usage.currentModelId = modelId;
    this.updateCostForUsage(usage);
    this.notifySubscribers(windowId);
  }

  private updateCostForUsage(usage: WindowTokenUsage): void {
    let inputPrice = 0;
    let outputPrice = 0;

    // Get pricing based on current provider and model
    switch (usage.currentProvider) {
      case 'anthropic':
        if (usage.currentModelId && usage.currentModelId in anthropicModels) {
          const model = anthropicModels[usage.currentModelId as keyof typeof anthropicModels];
          inputPrice = model.inputPrice;
          outputPrice = model.outputPrice;
        }
        break;
      case 'openai':
        if (usage.currentModelId && usage.currentModelId in openaiModels) {
          const model = openaiModels[usage.currentModelId as keyof typeof openaiModels];
          inputPrice = model.inputPrice;
          outputPrice = model.outputPrice;
        }
        break;
      case 'gemini':
        if (usage.currentModelId && usage.currentModelId in geminiModels) {
          const model = geminiModels[usage.currentModelId as keyof typeof geminiModels];
          inputPrice = model.inputPrice;
          outputPrice = model.outputPrice;
        }
        break;
      case 'ollama':
        if (usage.currentModelId && usage.currentModelId in ollamaModels) {
          const model = ollamaModels[usage.currentModelId as keyof typeof ollamaModels];
          inputPrice = model.inputPrice;
          outputPrice = model.outputPrice;
        }
        break;
    }

    // Calculate cost based on price per million tokens
    const inputCost = (inputPrice / 1_000_000) * usage.inputTokens;
    const outputCost = (outputPrice / 1_000_000) * usage.outputTokens;
    usage.cost = inputCost + outputCost;
  }

  private notifySubscribers(windowId?: number): void {
    // Send message to UI via Chrome runtime messaging
    try {
      const usage = this.getUsage(windowId);

      if (windowId !== undefined && windowId !== null) {
        chrome.tabs.query({ active: true, windowId })
          .then(tabs => {
            const tabId = tabs[0]?.id;
            chrome.runtime.sendMessage({
              action: 'tokenUsageUpdated',
              content: usage,
              tabId,
              windowId
            });
          })
          .catch(error => {
            console.error('Error querying tab for window:', error);
            chrome.runtime.sendMessage({
              action: 'tokenUsageUpdated',
              content: usage,
              windowId
            });
          });
      } else {
        // Get the current tab ID and window ID if possible
        chrome.tabs.query({ active: true, lastFocusedWindow: true })
          .then(tabs => {
            const tabId = tabs[0]?.id;
            const currentWindowId = tabs[0]?.windowId || windowId;

            chrome.runtime.sendMessage({
              action: 'tokenUsageUpdated',
              content: usage,
              tabId,
              windowId: currentWindowId
            });
          })
          .catch(error => {
            // If we can't get the current tab, just send the message without tab/window ID
            console.error('Error getting current tab:', error);
            chrome.runtime.sendMessage({
              action: 'tokenUsageUpdated',
              content: usage
            });
          });
      }
    } catch (error) {
      console.error('Error sending token usage update:', error);
    }

    // Also notify local subscribers
    this.subscribers.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
  }
}
