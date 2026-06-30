import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { initializeFromStorage, setTheme } from '../store/slices/settingsSlice';

const THEME_STORAGE_KEY = 'browserbee_theme_mode';

const applyTheme = (theme: 'light' | 'dark') => {
    const htmlElement = document.documentElement;
    if (htmlElement) {
        htmlElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
    }

    const bodyElement = document.body;
    if (bodyElement) {
        if (theme === 'light') {
            bodyElement.style.background = '#f0f4f8';
        } else {
            bodyElement.style.background = '#0f172a';
        }
    }
};

export function ReduxThemeProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const theme = useAppSelector((state) => state.settings.theme);
    const isInitialized = useAppSelector((state) => state.settings.isInitialized);

    useEffect(() => {
        dispatch(initializeFromStorage());
    }, [dispatch]);

    useEffect(() => {
        if (isInitialized) {
            applyTheme(theme);

            if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
                chrome.storage.sync.set({ [THEME_STORAGE_KEY]: theme });
            }
        }
    }, [theme, isInitialized]);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e: MediaQueryListEvent) => {
                if (!isInitialized) return;
                const newTheme = e.matches ? 'dark' : 'light';
                dispatch(setTheme(newTheme));
            };

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [dispatch, isInitialized]);

    if (!isInitialized) {
        return null;
    }

    return <>{children}</>;
}
