import { faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import { ConfigManager, ProviderConfig } from '../../background/configManager';
import { TokenTrackingService, TokenUsage } from '../../tracking/tokenTrackingService';

// Helper function to format token counts
const formatTokenCount = (count: number): string => {
  if (count < 1000) {
    return count.toString();
  }
  return (count / 1000).toFixed(1) + 'k';
};

export function TokenUsageDisplay() {
  const [usage, setUsage] = useState<TokenUsage>({ inputTokens: 0, outputTokens: 0, cost: 0 });
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);

  useEffect(() => {
    // Get instances
    const tokenTracker = TokenTrackingService.getInstance();
    const configManager = ConfigManager.getInstance();

    // Get initial usage
    const initialUsage = tokenTracker.getUsage();
    setUsage(initialUsage);

    // Subscribe to local updates
    const unsubscribe = tokenTracker.subscribe(() => {
      const updatedUsage = tokenTracker.getUsage();
      setUsage(updatedUsage);
    });

    // Get provider configuration and update token tracker
    configManager.getProviderConfig().then(config => {
      setProviderConfig(config);
      // Update token tracker with current provider and model
      tokenTracker.updateProviderAndModel(config.provider, config.apiModelId || '');
    });

    // Listen for messages from the background script
    const messageListener = (message: any) => {
      if (message.action === 'tokenUsageUpdated' && message.content) {
        setUsage(message.content);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Request current usage from background script
    chrome.runtime.sendMessage({ action: 'getTokenUsage' });

    return () => {
      unsubscribe();
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // const totalTokens = usage.inputTokens + usage.outputTokens;

  // Format provider name for display
  // const formatProviderName = (provider: string) => {
  //   switch (provider) {
  //     case 'anthropic': return 'Anthropic';
  //     case 'openai': return 'OpenAI';
  //     case 'gemini': return 'Google';
  //     case 'ollama': return 'Ollama';
  //     default: return provider;
  //   }
  // };

  // // Format model name for display
  // const formatModelName = (modelId: string) => {
  //   // Extract the model name from the model ID
  //   if (modelId.includes('claude')) {
  //     // For Claude models, extract the version and variant
  //     const match = modelId.match(/claude-(\d+\.\d+)-(\w+)/);
  //     if (match) {
  //       return `Claude ${match[1]} ${match[2].charAt(0).toUpperCase() + match[2].slice(1)}`;
  //     }
  //     return modelId;
  //   } else if (modelId.includes('gpt')) {
  //     // For GPT models, capitalize and format
  //     return modelId.toUpperCase().replace(/-/g, ' ');
  //   } else if (modelId.includes('gemini')) {
  //     // For Gemini models, capitalize and format
  //     const parts = modelId.split('-');
  //     return `Gemini ${parts[1]} ${parts[2].charAt(0).toUpperCase() + parts[2].slice(1)}`;
  //   } else if (modelId.includes('llama')) {
  //     // For Llama models, capitalize and format
  //     return `Llama ${modelId.replace('llama', '')}`;
  //   } else if (modelId.includes('Qwen')) {
  //     // For Qwen models, format nicely
  //     return modelId.replace('-Instruct', '');
  //   }
  //   return modelId;
  // };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 10px',
      borderRadius: '8px',
      background: 'rgba(255,255,255,0.7)',
      border: '1px solid rgba(0,0,0,0.07)',
      marginBottom: '6px',
      fontSize: '11px',
      gap: '8px',
    }}>
      <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        Tokens
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: '#94a3b8' }}>
          <span style={{ color: '#60a5fa', fontWeight: 600 }}>↑</span>
          {' '}{formatTokenCount(usage.inputTokens)}
        </span>
        <span style={{ color: '#94a3b8' }}>
          <span style={{ color: '#4ade80', fontWeight: 600 }}>↓</span>
          {' '}{formatTokenCount(usage.outputTokens)}
        </span>
        <span style={{
          color: '#f5a623',
          fontWeight: 600,
          background: 'rgba(245,166,35,0.1)',
          padding: '1px 7px',
          borderRadius: '4px',
          border: '1px solid rgba(245,166,35,0.2)',
        }}>
          ${usage.cost.toFixed(5)}
        </span>
      </div>
    </div>
  );
}
