import React from 'react';
import { useAppSelector } from '../../store/hooks';

export function AboutSection() {
  const language = useAppSelector((state) => state.settings.language);

  const t = (key: string): string => {
    const translationDict: Record<string, Record<string, string>> = {
      'About': { zh: '关于', en: 'About' },
      'BrowserBee 🐝 is a Chrome extension that allows you to control your browser using natural language. It supports multiple LLM providers including Anthropic, OpenAI, Google Gemini, and Ollama to interpret your instructions and uses Playwright to execute them.': {
        zh: 'BrowserBee 🐝 是一个 Chrome 扩展，让你可以用自然语言控制浏览器。它支持多个大模型提供商，包括 Anthropic、OpenAI、Google Gemini 和 Ollama，用 Playwright 执行操作。',
        en: 'BrowserBee 🐝 is a Chrome extension that allows you to control your browser using natural language. It supports multiple LLM providers including Anthropic, OpenAI, Google Gemini, and Ollama to interpret your instructions and uses Playwright to execute them.'
      },
      'To use the extension, click on the extension icon to open the side panel, then enter your instructions in the prompt field and hit Enter.': {
        zh: '使用方法：点击扩展图标打开侧边栏，在输入框中输入指令，按回车即可。',
        en: 'To use the extension, click on the extension icon to open the side panel, then enter your instructions in the prompt field and hit Enter.'
      },
    };
    const translated = translationDict[key.trim()]?.[language];
    return translated ?? key;
  };

  return (
    <div className="card bg-base-100 shadow-md mb-6">
      <div className="card-body">
        <h2 className="card-title text-xl">{t('About')}</h2>
        <p className="mb-3">
          {t('BrowserBee 🐝 is a Chrome extension that allows you to control your browser using natural language. It supports multiple LLM providers including Anthropic, OpenAI, Google Gemini, and Ollama to interpret your instructions and uses Playwright to execute them.')}
        </p>
        <p>
          {t('To use the extension, click on the extension icon to open the side panel, then enter your instructions in the prompt field and hit Enter.')}
        </p>
      </div>
    </div>
  );
}
