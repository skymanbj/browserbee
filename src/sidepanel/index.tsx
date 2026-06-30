import '../background/setup';
// React is needed for JSX

import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ReduxThemeProvider } from '../context/ReduxThemeProvider';
import '../index.css';
import { store } from '../store';
import { SidePanel } from './SidePanel';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
    <Provider store={store}>
        <ReduxThemeProvider>
            <SidePanel />
        </ReduxThemeProvider>
    </Provider>
);
