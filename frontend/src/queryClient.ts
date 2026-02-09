import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { AxiosError, isAxiosError } from 'axios';
import { notify } from './utils/notify';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
type ApiErrorPayload = { error?: string; message?: string } | string;

const toDefaultErrorMessage = (error: unknown): string | null => {
    if (isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiErrorPayload>;
        if (axiosError.code === 'ERR_CANCELED') {
            return null;
        }

        const responseData = axiosError.response?.data;
        if (typeof responseData === 'string') {
            if (responseData.trim()) {
                return responseData;
            }
        } else if (responseData && typeof responseData === 'object') {
            if (responseData.error) {
                return responseData.error;
            }

            if (responseData.message) {
                return responseData.message;
            }
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

export const queryClient = new QueryClient({
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
