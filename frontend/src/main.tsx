import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tokens.scss';
import './index.scss';
import 'leaflet/dist/leaflet.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement,
);

root.render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </React.StrictMode>,
);
