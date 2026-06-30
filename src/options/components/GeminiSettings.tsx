import { useState } from 'react';
import { useAppSelector } from '../../store/hooks';

interface GeminiSettingsProps {
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  geminiBaseUrl: string;
  setGeminiBaseUrl: (url: string) => void;
}

export function GeminiSettings({
  geminiApiKey,
  setGeminiApiKey,
  geminiBaseUrl,
  setGeminiBaseUrl
}: GeminiSettingsProps) {
  const language = useAppSelector((state) => state.settings.language);

  const t = (key: string): string => {
    const cleanKey = key.trim();
    const translationDict: Record<string, Record<string, string>> = {
      'Google Gemini - Good value for money': {
        zh: 'Google Gemini - 性价比高',
        en: 'Google Gemini - Good value for money'
      }
    };
    const translated = translationDict[cleanKey]?.[language];
    return translated ?? key;
  };
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const handleTestConnection = async () => {
    if (!geminiApiKey) {
      setTestStatus(t('请填写 API Key'));
      return;
    }
    setTesting(true);
    setTestStatus(null);
    try {
      const url = geminiBaseUrl.trim() || 'https://generativelanguage.googleapis.com';
      const formattedUrl = url.endsWith('/') ? url.slice(0, -1) : url;

      const response = await fetch(`${formattedUrl}/v1beta/models?key=${geminiApiKey.trim()}`, {
        method: 'GET'
      });
      if (response.status === 200) {
        setTestStatus(t('✔ 连接成功'));
      } else if (response.status === 400 || response.status === 403) {
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
      <h3 className="font-bold mb-2">Google Gemini Settings</h3>

      <div className="form-control mb-4">
        <label htmlFor="gemini-api-key" className="label">
          <span className="label-text">API Key:</span>
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            id="gemini-api-key"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="Enter your Google AI API key"
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
        <label htmlFor="gemini-base-url" className="label">
          <span className="label-text">Base URL (optional):</span>
        </label>
        <input
          type="text"
          id="gemini-base-url"
          value={geminiBaseUrl}
          onChange={(e) => setGeminiBaseUrl(e.target.value)}
          placeholder="Custom base URL (leave empty for default)"
          className="input input-bordered w-full"
        />
      </div>
    </div>
  );
}
