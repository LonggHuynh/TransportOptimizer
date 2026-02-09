import { useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Id } from 'react-toastify';
import { notify } from '../../utils/notify';
import { useRouteComputationStore } from '../store/useRouteComputationStore';
import {
    ComputeOrderInput,
    ComputeRouteQueuedResponse,
    enqueueComputeRoute,
    fetchRouteStatus,
    RouteJobStatusResponse,
    toBestRoutes,
} from './routeJobApi';

const ROUTE_STATUS_POLL_INTERVAL_MS = 1000;

export interface UseComputePathAndTimeOptions {
    onEnqueueSuccess?: (
        data: ComputeRouteQueuedResponse,
        variables: ComputeOrderInput,
    ) => void;
    onEnqueueError?: (
        error: AxiosError,
        variables: ComputeOrderInput,
    ) => void;
    onJobStatusSuccess?: (data: RouteJobStatusResponse) => void;
    onJobStatusFailed?: (data: RouteJobStatusResponse) => void;
    onJobStatusError?: (error: AxiosError) => void;
}

const wait = (ms: number) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
    });

export const useComputePathAndTime = (
    options: UseComputePathAndTimeOptions = {},
) => {
    const {
        onEnqueueSuccess: onEnqueueSuccessOption,
        onEnqueueError: onEnqueueErrorOption,
        onJobStatusSuccess: onJobStatusSuccessOption,
        onJobStatusFailed: onJobStatusFailedOption,
        onJobStatusError: onJobStatusErrorOption,
    } = options;

    const setComputedRouteResult = useRouteComputationStore(
        (state) => state.setComputedRouteResult,
    );
    const setLastRequest = useRouteComputationStore((state) => state.setLastRequest);

    const activeRequestIdRef = useRef(0);
    const optimizationToastIdRef = useRef<Id | null>(null);

    const startOptimizationToast = useCallback(() => {
        if (optimizationToastIdRef.current) {
            notify.dismiss(optimizationToastIdRef.current);
        }
        optimizationToastIdRef.current = notify.loading('Optimizing route...');
    }, []);

    const resolveOptimizationToast = useCallback((
        message: string,
        tone: 'success' | 'error' = 'success',
    ) => {
        if (optimizationToastIdRef.current) {
            notify.resolve(optimizationToastIdRef.current, message, tone);
            optimizationToastIdRef.current = null;
            return;
        }

        if (tone === 'error') {
            notify.error(message);
            return;
        }

        notify.success(message);
    }, []);

    const pollRouteStatus = useCallback(async (
        jobId: string,
        places: string[],
        requestId: number,
    ) => {
        while (activeRequestIdRef.current === requestId) {
            try {
                const statusResponse = await fetchRouteStatus(jobId);
                if (activeRequestIdRef.current !== requestId) {
                    return;
                }

                if (statusResponse.status === 'failed') {
                    setComputedRouteResult({
                        status: statusResponse.status,
                        error: statusResponse.error ?? 'Route optimization failed.',
                        bestRoutes: [],
                        totalTime: null,
                    });
                    resolveOptimizationToast(
                        statusResponse.error ?? 'Failed to calculate route.',
                        'error',
                    );
                    onJobStatusFailedOption?.(statusResponse);
                    return;
                }

                if (statusResponse.status === 'completed' && statusResponse.result) {
                    setComputedRouteResult({
                        status: statusResponse.status,
                        error: statusResponse.error,
                        bestRoutes: toBestRoutes(statusResponse.result, places),
                        totalTime: statusResponse.result.totalTime ?? null,
                    });
                    resolveOptimizationToast('Route optimized.');
                    onJobStatusSuccessOption?.(statusResponse);
                    return;
                }

                setComputedRouteResult({
                    status: statusResponse.status,
                    error: statusResponse.error,
                    bestRoutes: [],
                    totalTime: null,
                });
                await wait(ROUTE_STATUS_POLL_INTERVAL_MS);
            } catch (error) {
                if (activeRequestIdRef.current !== requestId) {
                    return;
                }

                const axiosError = error as AxiosError;
                setComputedRouteResult({
                    status: 'failed',
                    error: axiosError.message || 'Failed to check route status.',
                    bestRoutes: [],
                    totalTime: null,
                });
                resolveOptimizationToast('Failed to calculate route.', 'error');
                onJobStatusErrorOption?.(axiosError);
                return;
            }
        }
    }, [
        onJobStatusErrorOption,
        onJobStatusFailedOption,
        onJobStatusSuccessOption,
        resolveOptimizationToast,
        setComputedRouteResult,
    ]);

    const onEnqueueSuccess = useCallback((
        data: ComputeRouteQueuedResponse,
        variables: ComputeOrderInput,
        requestId: number,
    ) => {
        setLastRequest({
            places: variables.places,
            stopWindows: variables.stopWindows,
            startTimeUtc: variables.startTimeUtc,
            travelMode: variables.travelMode,
        });
        setComputedRouteResult({
            status: data.status,
            error: undefined,
            bestRoutes: [],
            totalTime: null,
        });
        onEnqueueSuccessOption?.(data, variables);
        void pollRouteStatus(data.jobId, variables.places, requestId);
    }, [
        onEnqueueSuccessOption,
        pollRouteStatus,
        setComputedRouteResult,
        setLastRequest,
    ]);

    const onEnqueueError = useCallback((error: AxiosError, variables: ComputeOrderInput) => {
        setComputedRouteResult({
            status: 'failed',
            error: error.message || 'Failed to calculate route.',
            bestRoutes: [],
            totalTime: null,
        });
        resolveOptimizationToast('Failed to calculate route.', 'error');
        onEnqueueErrorOption?.(error, variables);
    }, [onEnqueueErrorOption, resolveOptimizationToast, setComputedRouteResult]);

    const enqueueMutation = useMutation<
        ComputeRouteQueuedResponse,
        AxiosError,
        ComputeOrderInput,
        { requestId: number }
    >({
        mutationFn: enqueueComputeRoute,
        onMutate: () => {
            const requestId = activeRequestIdRef.current + 1;
            activeRequestIdRef.current = requestId;
            startOptimizationToast();
            setComputedRouteResult({
                status: 'queued',
                error: undefined,
                bestRoutes: [],
                totalTime: null,
            });
            return { requestId };
        },
        onSuccess: (data, variables, context) => {
            if (!context || activeRequestIdRef.current !== context.requestId) {
                return;
            }

            onEnqueueSuccess(data, variables, context.requestId);
        },
        onError: (error, variables, context) => {
            if (context && activeRequestIdRef.current !== context.requestId) {
                return;
            }

            onEnqueueError(error, variables);
        },
    });

    return {
        enqueueMutation,
    };
};
