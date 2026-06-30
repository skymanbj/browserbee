import { faCog, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import { ConfigManager } from '../../background/configManager';
import { TokenTrackingService } from '../../tracking/tokenTrackingService';

interface ProviderOption {
  provider: string;
  displayName: string;
  models: {id: string, name: string}[];
}

interface ProviderSelectorProps {
  isProcessing: boolean;
}

export function ProviderSelector({ isProcessing }: ProviderSelectorProps) {
  const [options, setOptions] = useState<ProviderOption[]>([]);
  const [currentProvider, setCurrentProvider] = useState<string>('');
  const [currentModel, setCurrentModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Function to load provider options
  const loadOptions = async () => {
    setIsLoading(true);
    const configManager = ConfigManager.getInstance();
    
    // Get current config
    const config = await configManager.getProviderConfig();
    setCurrentProvider(config.provider);
    setCurrentModel(config.apiModelId || '');
    
    // Get configured providers
    const providers = await configManager.getConfiguredProviders();

    // Get instance names for display
    const storageResult = await chrome.storage.sync.get({ openaiCompatibleInstances: [] });
    const instances: Array<{ id: string; name: string }> = storageResult.openaiCompatibleInstances || [];
    
    // Build options
    const providerOptions: ProviderOption[] = [];
    
    for (const provider of providers) {
      const models = await configManager.getModelsForProvider(provider);
      
      let displayName: string;
      if (provider.startsWith('openai-compatible:')) {
        const instId = provider.substring('openai-compatible:'.length);
        const inst = instances.find((i: { id: string; name: string }) => i.id === instId);
        displayName = inst ? inst.name : 'OpenAI Compatible';
      } else {
        displayName = formatProviderName(provider);
      }
      
      providerOptions.push({
        provider,
        displayName,
        models,
      });
    }
    
    setOptions(providerOptions);
    setIsLoading(false);
  };
  
  // Load options when component mounts
  useEffect(() => {
    loadOptions();
  }, []);
  
  // Listen for provider configuration changes
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.action === 'providerConfigChanged') {
        console.log('Provider configuration changed, refreshing options');
        loadOptions();
      }
    };
    
    // Add the message listener
    chrome.runtime.onMessage.addListener(handleMessage);
    
    // Clean up the listener when the component unmounts
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);
  
  const formatProviderName = (provider: string) => {
    switch (provider) {
      case 'anthropic': return 'Anthropic';
      case 'openai': return 'OpenAI';
      case 'gemini': return 'Google';
      case 'ollama': return 'Ollama';
      default: {
        if (provider.startsWith('openai-compatible:')) {
          return 'OpenAI Compatible';
        }
        return provider;
      }
    }
  };
  
  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const separatorIndex = value.lastIndexOf('|');
    const provider = value.substring(0, separatorIndex);
    const modelId = value.substring(separatorIndex + 1);
    
    if (provider && modelId) {
      setCurrentProvider(provider);
      setCurrentModel(modelId);
      
      // Update config
      const configManager = ConfigManager.getInstance();
      await configManager.updateProviderAndModel(provider, modelId);
      
      // Update token tracking service with new provider and model
      const tokenTracker = TokenTrackingService.getInstance();
      tokenTracker.updateProviderAndModel(provider, modelId);
      
      // Clear message history to ensure a clean state with the new provider
      try {
        await chrome.runtime.sendMessage({
          action: 'clearHistory'
        });
        
        // Show a message to the user
        chrome.runtime.sendMessage({
          action: 'updateOutput',
          content: {
            type: 'system',
            content: `Switched to ${formatProviderName(provider)} model: ${modelId}`
          }
        });
      } catch (error) {
        console.error('Error clearing history:', error);
      }
      
      // Reload the page to apply changes
      window.location.reload();
    }
  };
  
  if (isLoading || options.length === 0) {
    return null;
  }
  
  // Function to open options page in a new tab
  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage();
  };
  
  // Function to open help documentation
  const openHelpPage = () => {
    window.open('https://parsaghaffari.github.io/browserbee/', '_blank');
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginTop: '6px',
      padding: '7px 10px',
      borderRadius: '10px',
      background: 'rgba(255,255,255,0.8)',
      border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      {/* 设置按钮 */}
      <button
        onClick={openOptionsPage}
        disabled={isProcessing}
        title="打开设置"
        style={{
          width: '28px', height: '28px',
          borderRadius: '8px',
          background: 'rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.1)',
          color: '#64748b',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s',
          opacity: isProcessing ? 0.4 : 1,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#f5a623'; e.currentTarget.style.borderColor = 'rgba(245,166,35,0.35)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
      >
        <FontAwesomeIcon icon={faCog} style={{ fontSize: '12px' }} />
      </button>

      {/* 模型选择 */}
      <select
        value={`${currentProvider}|${currentModel}`}
        onChange={handleChange}
        disabled={isProcessing}
        style={{
          flex: 1,
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '8px',
          color: '#374151',
          fontSize: '12px',
          padding: '4px 8px',
          cursor: 'pointer',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(245,166,35,0.4)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
      >
        {options.map(option => (
          option.models.map(model => (
            <option
              key={`${option.provider}|${model.id}`}
              value={`${option.provider}|${model.id}`}
              style={{ background: '#ffffff', color: '#374151' }}
            >
              {model.name}
            </option>
          ))
        ))}
      </select>

      {/* 帮助按钮 */}
      <button
        onClick={openHelpPage}
        disabled={isProcessing}
        title="查看帮助文档"
        style={{
          width: '28px', height: '28px',
          borderRadius: '8px',
          background: 'rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.1)',
          color: '#64748b',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s',
          opacity: isProcessing ? 0.4 : 1,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
      >
        <FontAwesomeIcon icon={faCircleInfo} style={{ fontSize: '12px' }} />
      </button>
    </div>
  );
}
