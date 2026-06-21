import React, { useState, useEffect } from 'react';
import { OpenAICompatibleInstance } from '../../models/providers/openai-compatible';

interface ProviderSelectorProps {
  provider: string;
  setProvider: (provider: string) => void;
  openaiCompatibleInstances: OpenAICompatibleInstance[];
}

export function ProviderSelector({ provider, setProvider, openaiCompatibleInstances }: ProviderSelectorProps) {
  const [tempValue, setTempValue] = useState<string | null>(null);

  // Reset temp value when the compat manager is closed
  useEffect(() => {
    const resetHandler = () => setTempValue(null);
    window.addEventListener('browserbee:closeOpenAICompatible', resetHandler);
    return () => window.removeEventListener('browserbee:closeOpenAICompatible', resetHandler);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '__add_openai_compatible__') {
      // Keep showing the "+ Add..." option while the manager opens
      setTempValue(value);
      window.dispatchEvent(new CustomEvent('browserbee:addOpenAICompatible'));
    } else {
      setTempValue(null);
      setProvider(value);
    }
  };

  // The displayed value: use tempValue when set, otherwise provider
  const displayValue = tempValue || provider;

  return (
    <div className="form-control mb-4">
      <label className="label">
        <span className="label-text font-medium">LLM Provider:</span>
      </label>
      <select 
        className="select select-bordered" 
        value={displayValue} 
        onChange={handleChange}
      >
        <option value="anthropic">Anthropic (Claude)</option>
        <option value="openai">OpenAI (GPT)</option>
        <option value="gemini">Google (Gemini)</option>
        <option value="ollama">Ollama</option>
        <option disabled>── OpenAI Compatible ──</option>
        {openaiCompatibleInstances.map(inst => (
          <option key={inst.id} value={`openai-compatible:${inst.id}`}>
            {inst.name}
          </option>
        ))}
        <option value="__add_openai_compatible__">+ Add OpenAI Compatible Provider</option>
      </select>
    </div>
  );
}
