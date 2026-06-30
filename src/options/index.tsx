import '../background/setup';
// React is needed for JSX

import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ReduxThemeProvider } from '../context/ReduxThemeProvider';
import '../index.css';
import { store } from '../store';
import { Options } from './Options';
import { ReduxLanguageProvider } from './ReduxLanguageProvider';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
    <Provider store={store}>
        <ReduxThemeProvider>
            <ReduxLanguageProvider>
                <Options />
            </ReduxLanguageProvider>
        </ReduxThemeProvider>
    </Provider>
);
