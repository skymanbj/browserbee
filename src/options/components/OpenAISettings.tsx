import { useState } from 'react';
import { useAppSelector } from '../../store/hooks';

interface OpenAISettingsProps {
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
  openaiBaseUrl: string;
  setOpenaiBaseUrl: (url: string) => void;
}

export function OpenAISettings({
  openaiApiKey,
  setOpenaiApiKey,
  openaiBaseUrl,
  setOpenaiBaseUrl
}: OpenAISettingsProps) {
  const language = useAppSelector((state) => state.settings.language);

  const t = (key: string): string => {
    const cleanKey = key.trim();
    const translationDict: Record<string, Record<string, string>> = {
      'OpenAI - Popular and reliable': {
        zh: 'OpenAI - 流行且可靠',
        en: 'OpenAI - Popular and reliable'
      }
    };
    const translated = translationDict[cleanKey]?.[language];
    return translated ?? key;
  };
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const handleTestConnection = async () => {
    if (!openaiApiKey) {
      setTestStatus(t('请填写 API Key'));
      return;
    }
    setTesting(true);
    setTestStatus(null);
    try {
      const url = openaiBaseUrl.trim() || 'https://api.openai.com/v1';
      const formattedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const response = await fetch(`${formattedUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${openaiApiKey.trim()}`,
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
      <h3 className="font-bold mb-2">OpenAI Settings</h3>

      <div className="form-control mb-4">
        <label htmlFor="openai-api-key" className="label">
          <span className="label-text">API Key:</span>
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            id="openai-api-key"
            value={openaiApiKey}
            onChange={(e) => setOpenaiApiKey(e.target.value)}
            placeholder="Enter your OpenAI API key"
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
        <label htmlFor="openai-base-url" className="label">
          <span className="label-text">Base URL (optional):</span>
        </label>
        <input
          type="text"
          id="openai-base-url"
          value={openaiBaseUrl}
          onChange={(e) => setOpenaiBaseUrl(e.target.value)}
          placeholder="Custom base URL (leave empty for default)"
          className="input input-bordered w-full"
        />
      </div>
    </div>
  );
}
