import '../background/setup';
// React is needed for JSX

import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '../context/ThemeContext';
import '../index.css';
import { SidePanel } from './SidePanel';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
    <ThemeProvider>
        <SidePanel />
    </ThemeProvider>
);
