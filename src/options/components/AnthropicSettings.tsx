import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';

interface AnthropicSettingsProps {
  anthropicApiKey: string;
  setAnthropicApiKey: (key: string) => void;
  anthropicBaseUrl: string;
  setAnthropicBaseUrl: (url: string) => void;
  thinkingBudgetTokens: number;
  setThinkingBudgetTokens: (tokens: number) => void;
}

export function AnthropicSettings({
  anthropicApiKey,
  setAnthropicApiKey,
  anthropicBaseUrl,
  setAnthropicBaseUrl,
  thinkingBudgetTokens,
  setThinkingBudgetTokens
}: AnthropicSettingsProps) {
  const { t } = useLanguage();
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const handleTestConnection = async () => {
    if (!anthropicApiKey) {
      setTestStatus(t('请填写 API Key'));
      return;
    }
    setTesting(true);
    setTestStatus(null);
    try {
      const url = anthropicBaseUrl.trim() || 'https://api.anthropic.com';
      const formattedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const response = await fetch(`${formattedUrl}/v1/models`, {
        method: 'GET',
        headers: {
          'x-api-key': anthropicApiKey.trim(),
          'anthropic-version': '2023-06-01',
        }
      });
      if (response.status === 200) {
        setTestStatus(t('✔ 连接成功'));
      } else if (response.status === 401 || response.status === 403) {
        setTestStatus(t('❌ API Key 无效或未授权'));
      } else {
        setTestStatus(t('✔ 接口响应正常') + ` (Status: ${response.status})`);
      }
    } catch (err: any) {
      setTestStatus(t('❌ 连接失败') + `: ${err.message || err}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-4">
      <h3 className="font-bold mb-2">Anthropic Settings</h3>
      
      <div className="form-control mb-4">
        <label htmlFor="anthropic-api-key" className="label">
          <span className="label-text">API Key:</span>
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            id="anthropic-api-key"
            value={anthropicApiKey}
            onChange={(e) => setAnthropicApiKey(e.target.value)}
            placeholder="Enter your Anthropic API key"
            className="input input-bordered flex-1"
          />
          <button
            type="button"
            className={`btn btn-outline ${testing ? 'loading' : ''}`}
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? t('Saving...') : t('Test Connection')}
          </button>
        </div>
        {testStatus && (
          <div className={`text-xs mt-1.5 ${testStatus.includes('成功') || testStatus.includes('正常') || testStatus.includes('✔') ? 'text-success font-medium' : 'text-error'}`}>
            {testStatus}
          </div>
        )}
      </div>
      
      <div className="form-control mb-4">
        <label htmlFor="anthropic-base-url" className="label">
          <span className="label-text">Base URL (optional):</span>
        </label>
        <input
          type="text"
          id="anthropic-base-url"
          value={anthropicBaseUrl}
          onChange={(e) => setAnthropicBaseUrl(e.target.value)}
          placeholder="Custom base URL (leave empty for default)"
          className="input input-bordered w-full"
        />
      </div>
      
      <div className="form-control mb-4">
        <label htmlFor="thinking-budget" className="label">
          <span className="label-text">Thinking Budget (tokens):</span>
        </label>
        <input
          type="number"
          id="thinking-budget"
          value={thinkingBudgetTokens}
          onChange={(e) => setThinkingBudgetTokens(parseInt(e.target.value) || 0)}
          placeholder="0 to disable thinking"
          className="input input-bordered w-full"
          min="0"
        />
        <label className="label">
          <span className="label-text-alt">Set to 0 to disable Claude's thinking feature</span>
        </label>
      </div>
    </div>
  );
}
