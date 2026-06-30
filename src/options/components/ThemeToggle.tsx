import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setTheme } from '../../store/slices/settingsSlice';

export function ThemeToggle() {
    const dispatch = useAppDispatch();
    const themeMode = useAppSelector((state) => state.settings.theme);

    const toggleTheme = () => {
        dispatch(setTheme(themeMode === 'light' ? 'dark' : 'light'));
    };

    return (
        <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-sm rounded-full flex items-center gap-1.5"
            aria-label={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} theme`}
            title={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} theme`}
        >
            {themeMode === 'light' ? (
                <>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                    </svg>
                    <span className="hidden sm:inline">Dark Mode</span>
                </>
            ) : (
                <>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2" />
                        <path d="M12 20v2" />
                        <path d="m4.93 4.93 1.41 1.41" />
                        <path d="m17.66 17.66 1.41 1.41" />
                        <path d="M2 12h2" />
                        <path d="M20 12h2" />
                        <path d="m6.34 17.66-1.41 1.41" />
                        <path d="m19.07 4.93-1.41 1.41" />
                    </svg>
                    <span className="hidden sm:inline">Light Mode</span>
                </>
            )}
        </button>
    );
}
