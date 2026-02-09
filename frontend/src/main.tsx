import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tokens.scss';
import './index.scss';
import 'leaflet/dist/leaflet.css';
import {
    MutationCache,
    QueryCache,
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query';
import { AxiosError, isAxiosError } from 'axios';
import { notify } from './utils/notify';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

const toDefaultErrorMessage = (error: unknown): string | null => {
    if (isAxiosError(error)) {
        const axiosError = error as AxiosError<{ error?: string; message?: string }>;
        if (axiosError.code === 'ERR_CANCELED') {
            return null;
        }

        const responseData = axiosError.response?.data;
        if (typeof responseData === 'string' && responseData.trim()) {
            return responseData;
        }

        if (responseData?.error) {
            return responseData.error;
        }

        if (responseData?.message) {
            return responseData.message;
        }

        if (axiosError.message) {
            return axiosError.message;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return 'Unexpected error occurred.';
};

const handleDefaultQueryError = (error: unknown) => {
    const message = toDefaultErrorMessage(error);
    if (!message) {
        return;
    }

    notify.error(message, {
        toastId: `query-client-error-${message}`,
    });
};

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement,
);
const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: handleDefaultQueryError,
    }),
    mutationCache: new MutationCache({
        onError: handleDefaultQueryError,
    }),
    defaultOptions: {
        queries: {
            staleTime: FIVE_MINUTES_MS,
        },
    },
});

root.render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </React.StrictMode>,
);
