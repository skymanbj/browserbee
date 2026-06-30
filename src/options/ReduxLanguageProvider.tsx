import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import type { Language } from '../store/slices/settingsSlice';
import { initializeFromStorage, setLanguage } from '../store/slices/settingsSlice';
import { LanguageContext } from './LanguageContext';

const translationDict: Record<string, Record<Language, string>> = {
    'General': { zh: '通用设置', en: 'General' },
    'LLM Configuration': { zh: '大模型配置', en: 'LLM Configuration' },
    'Memory': { zh: '记忆管理', en: 'Memory' },
    'Sessions': { zh: '会话管理', en: 'Sessions' },
    'Scheduled Tasks': { zh: '定时任务', en: 'Scheduled Tasks' },
    'Prompt Templates': { zh: '提示词模板', en: 'Prompt Templates' },
    'Settings saved successfully!': { zh: '设置保存成功！', en: 'Settings saved successfully!' },
    'Saving...': { zh: '保存中...', en: 'Saving...' },
    'Cancel': { zh: '取消', en: 'Cancel' },
    'Save': { zh: '保存', en: 'Save' },
    'Delete': { zh: '删除', en: 'Delete' },
    'Edit': { zh: '编辑', en: 'Edit' },
    'Export': { zh: '导出', en: 'Export' },
    'Import': { zh: '导入', en: 'Import' },
};

export function ReduxLanguageProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const language = useAppSelector((state) => state.settings.language);
    const isInitialized = useAppSelector((state) => state.settings.isInitialized);

    useEffect(() => {
        dispatch(initializeFromStorage());
    }, [dispatch]);

    useEffect(() => {
        if (isInitialized) {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                chrome.storage.local.set({ optionsLanguage: language });
            }
        }
    }, [language, isInitialized]);

    const t = (key: string): string => {
        const cleanKey = key.trim();
        if (translationDict[cleanKey] && translationDict[cleanKey][language]) {
            return translationDict[cleanKey][language];
        }
        return key;
    };

    const value = { language, setLanguage: (lang: Language) => dispatch(setLanguage(lang)), t };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}
