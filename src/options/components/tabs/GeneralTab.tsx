import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { AboutSection } from '../AboutSection';

export function GeneralTab() {
  const language = useAppSelector((state) => state.settings.language);
  const dispatch = useAppDispatch();

  const t = (key: string): string => {
    const cleanKey = key.trim();
    const translationDict: Record<string, Record<string, string>> = {
      '🚀 Getting Started': { zh: '🚀 开始使用', en: '🚀 Getting Started' },
      'Follow these simple steps to start using BrowserBee:': {
        zh: '按照以下简单步骤开始使用 BrowserBee：',
        en: 'Follow these simple steps to start using BrowserBee:'
      },
      '1. Get an API Key': { zh: '1. 获取 API 密钥', en: '1. Get an API Key' },
      'Obtain an API key from one of these LLM providers:': {
        zh: '从以下大模型提供商获取 API 密钥：',
        en: 'Obtain an API key from one of these LLM providers:'
      },
      'Anthropic - Recommended for best performance': {
        zh: 'Anthropic - 推荐（性能最佳）',
        en: 'Anthropic - Recommended for best performance'
      },
      'OpenAI - Popular and reliable': {
        zh: 'OpenAI - 流行且可靠',
        en: 'OpenAI - Popular and reliable'
      },
      'Google Gemini - Good value for money': {
        zh: 'Google Gemini - 性价比高',
        en: 'Google Gemini - Good value for money'
      },
      'Ollama - Free local models': {
        zh: 'Ollama - 免费本地模型',
        en: 'Ollama - Free local models'
      },
      '2. Configure BrowserBee': { zh: '2. 配置 BrowserBee', en: '2. Configure BrowserBee' },
      'Go to the LLM Configuration tab and:': {
        zh: '前往“大模型配置”标签页并：',
        en: 'Go to the LLM Configuration tab and:'
      },
      'Select your preferred provider': {
        zh: '选择您首选的提供商',
        en: 'Select your preferred provider'
      },
      'Enter your API key': {
        zh: '输入您的 API 密钥',
        en: 'Enter your API key'
      },
      'Click Save Settings': {
        zh: '点击“保存设置”',
        en: 'Click Save Settings'
      },
      '3. Run Your First Task': { zh: '3. 运行您的第一个任务', en: '3. Run Your First Task' },
      'Try this example to get started:': {
        zh: '尝试此示例以开始：',
        en: 'Try this example to get started:'
      },
      'Open a new tab and go to google.com': {
        zh: '打开一个新标签页并前往 google.com',
        en: 'Open a new tab and go to google.com'
      },
      'Click the BrowserBee icon or press Alt+Shift+B': {
        zh: '点击 BrowserBee 图标或按 Alt+Shift+B',
        en: 'Click the BrowserBee icon or press Alt+Shift+B'
      },
      'Search for the weather in Paris': {
        zh: '搜索巴黎的天气',
        en: 'Search for the weather in Paris'
      },
      'Press Enter and watch BrowserBee work! 🐝': {
        zh: '按回车键，观看 BrowserBee 开始工作！ 🐝',
        en: 'Press Enter and watch BrowserBee work! 🐝'
      },
      '💡 Pro Tips': { zh: '💡 实用技巧', en: '💡 Pro Tips' },
      'Keep BrowserBee attached:': {
        zh: '保持 BrowserBee 连接：',
        en: 'Keep BrowserBee attached:'
      },
      'Leave it connected to a tab throughout your session for best performance': {
        zh: '在整个会话中保持连接到标签页以获得最佳性能',
        en: 'Leave it connected to a tab throughout your session for best performance'
      },
      'Reattach if needed:': {
        zh: '需要时重新连接：',
        en: 'Reattach if needed:'
      },
      'If you close the attached tab, use the reattach button to reconnect': {
        zh: '如果您关闭了连接的标签页，请使用“重新连接”按钮重新连接',
        en: 'If you close the attached tab, use the reattach button to reconnect'
      },
      'One per window:': {
        zh: '每个窗口一个实例：',
        en: 'One per window:'
      },
      'You can run one BrowserBee instance per Chrome window': {
        zh: '您可以在每个 Chrome 窗口中运行一个 BrowserBee 实例',
        en: 'You can run one BrowserBee instance per Chrome window'
      },
      'Tab limitations:': {
        zh: '标签页限制：',
        en: 'Tab limitations:'
      },
      "BrowserBee can't attach to new tabs or chrome:// pages": {
        zh: 'BrowserBee 无法连接到新标签页或 chrome:// 开头的页面',
        en: "BrowserBee can't attach to new tabs or chrome:// pages"
      },
      'Need Help?': { zh: '需要帮助？', en: 'Need Help?' },
      'Join Discord Community': { zh: '加入 Discord 社区', en: 'Join Discord Community' },
      'Get help, share tips, and connect with other BrowserBee users': {
        zh: '获取帮助、分享技巧，并与其他 BrowserBee 用户建立联系',
        en: 'Get help, share tips, and connect with other BrowserBee users'
      }
    };

    const translated = translationDict[cleanKey]?.[language];
    return translated ?? key;
  };

  return (
    <div className="space-y-6">
      <AboutSection />

      {/* Getting Started Guide */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-xl">{t('🚀 Getting Started')}</h2>
          <p className="mb-4">
            {t('Follow these simple steps to start using BrowserBee:')}
          </p>

          {/* Demo Video */}
          <div className="mb-6">
            <div className="aspect-video w-full max-w-2xl mx-auto">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/SFBelCiZq_4"
                title="BrowserBee Demo"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="rounded-lg"
              ></iframe>
            </div>
          </div>

          {/* Step-by-step instructions */}
          <div className="steps steps-vertical lg:steps-horizontal w-full">
            <div className="step step-primary">
              <div className="step-content text-left">
                <h3 className="font-semibold text-lg mb-2">{t('1. Get an API Key')}</h3>
                <p className="text-sm mb-2">
                  {t('Obtain an API key from one of these LLM providers:')}
                </p>
                <ul className="text-sm list-disc list-inside space-y-1 ml-4">
                  <li><strong>Anthropic</strong> - {t('Anthropic - Recommended for best performance')}</li>
                  <li><strong>OpenAI</strong> - {t('OpenAI - Popular and reliable')}</li>
                  <li><strong>Google Gemini</strong> - {t('Google Gemini - Good value for money')}</li>
                  <li><strong>Ollama</strong> - {t('Ollama - Free local models')}</li>
                </ul>
              </div>
            </div>

            <div className="step step-primary">
              <div className="step-content text-left">
                <h3 className="font-semibold text-lg mb-2">{t('2. Configure BrowserBee')}</h3>
                <p className="text-sm mb-2">
                  {t('Go to the LLM Configuration tab and:')}
                </p>
                <ul className="text-sm list-disc list-inside space-y-1 ml-4">
                  <li>{t('Select your preferred provider')}</li>
                  <li>{t('Enter your API key')}</li>
                  <li>{t('Click Save Settings')}</li>
                </ul>
              </div>
            </div>

            <div className="step step-primary">
              <div className="step-content text-left">
                <h3 className="font-semibold text-lg mb-2">{t('3. Run Your First Task')}</h3>
                <p className="text-sm mb-2">
                  {t('Try this example to get started:')}
                </p>
                <ul className="text-sm list-disc list-inside space-y-1 ml-4">
                  <li>{t('Open a new tab and go to google.com')}</li>
                  <li>{t('Click the BrowserBee icon or press Alt+Shift+B')}</li>
                  <li>{t('Search for the weather in Paris')}</li>
                  <li>{t('Press Enter and watch BrowserBee work! 🐝')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Important Tips */}
          <div className="alert alert-info mt-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h3 className="font-bold">{t('💡 Pro Tips')}</h3>
              <ul className="text-sm mt-2 space-y-1">
                <li>• <strong>{t('Keep BrowserBee attached:')}</strong> {t('Leave it connected to a tab throughout your session for best performance')}</li>
                <li>• <strong>{t('Reattach if needed:')}</strong> {t('If you close the attached tab, use the reattach button to reconnect')}</li>
                <li>• <strong>{t('One per window:')}</strong> {t('You can run one BrowserBee instance per Chrome window')}</li>
                <li>• <strong>{t('Tab limitations:')}</strong> {t("BrowserBee can't attach to new tabs or chrome:// pages")}</li>
              </ul>
            </div>
          </div>

          {/* Support Section */}
          <div className="divider">{t('Need Help?')}</div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <a
              href="https://discord.gg/g42ww3wn"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-wide"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              {t('Join Discord Community')}
            </a>

            <div className="text-center">
              <p className="text-sm text-base-content/70">
                {t('Get help, share tips, and connect with other BrowserBee users')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
