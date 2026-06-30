import '../background/setup';
// React is needed for JSX

import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from './LanguageContext';
import '../index.css';
import { Options } from './Options';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
    <ThemeProvider>
        <LanguageProvider>
            <Options />
        </LanguageProvider>
    </ThemeProvider>
);
