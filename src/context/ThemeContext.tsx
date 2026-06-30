import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    themeMode: ThemeMode;
    toggleTheme: () => void;
    setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'browserbee_theme_mode';

/**
 * Load saved theme from chrome.storage or fall back to system preference
 */
const loadSavedTheme = async (): Promise<ThemeMode> => {
    try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            const result = await chrome.storage.sync.get({ [THEME_STORAGE_KEY]: 'dark' });
            if (result[THEME_STORAGE_KEY] === 'light' || result[THEME_STORAGE_KEY] === 'dark') {
                return result[THEME_STORAGE_KEY];
            }
        }
    } catch (error) {
        console.warn('Failed to load theme from storage:', error);
    }

    // Fallback to system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    }

    return 'dark';
};

/**
 * Save theme to chrome.storage and apply to HTML element
 */
const applyTheme = (theme: ThemeMode) => {
    // Update HTML data-theme attribute for daisyUI
    const htmlElement = document.documentElement;
    if (htmlElement) {
        htmlElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
    }

    // Update body background to ensure proper rendering
    const bodyElement = document.body;
    if (bodyElement) {
        if (theme === 'light') {
            bodyElement.style.background = '#f0f4f8';
        } else {
            bodyElement.style.background = '#0f172a';
        }
    }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Initialize theme on mount
        loadSavedTheme().then((savedTheme) => {
            setThemeModeState(savedTheme);
            applyTheme(savedTheme);
            setIsInitialized(true);
        });
    }, []);

    const setTheme = (theme: ThemeMode) => {
        setThemeModeState(theme);
        applyTheme(theme);

        // Save to chrome.storage
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.sync.set({ [THEME_STORAGE_KEY]: theme });
        }
    };

    const toggleTheme = () => {
        setTheme(themeMode === 'light' ? 'dark' : 'light');
    };

    // Listen for system theme changes
    useEffect(() => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e: MediaQueryListEvent) => {
                // Only update if user hasn't explicitly set a theme
                if (!isInitialized) return;

                const newTheme = e.matches ? 'dark' : 'light';
                setTheme(newTheme);
            };

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [isInitialized]);

    if (!isInitialized) {
        // Render nothing while initializing to prevent flash of wrong theme
        return null;
    }

    return (
        <ThemeContext.Provider value={{ themeMode, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
