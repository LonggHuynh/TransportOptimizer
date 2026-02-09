import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Id } from 'react-toastify';
import { StopWindow } from '../../models/stopWindow';
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

const RECALCULATION_STATUS_POLL_INTERVAL_MS = 1000;

const buildRemainingPlaces = (
    bestRoutes: [string, string][],
    completedLegIndex: number,
) => {
    const completedLeg = bestRoutes[completedLegIndex];
    if (!completedLeg) {
        return [] as string[];
    }

    const [_, nextOrigin] = completedLeg;
    const remainingDestinations = bestRoutes
        .slice(completedLegIndex + 1)
        .map((leg) => leg[1]);

    return [nextOrigin, ...remainingDestinations];
};

const remapStopWindows = (
    nextPlaces: string[],
    previousPlaces: string[],
    previousStopWindows: StopWindow[],
) => {
    if (nextPlaces.length < 3 || previousStopWindows.length === 0) {
        return [] as StopWindow[];
    }

    const stopWindowByOriginalIndex = new Map<number, StopWindow>(
        previousStopWindows.map((window) => [window.stopIndex, window]),
    );
    const usedOriginalIndices = new Set<number>();

    return nextPlaces.slice(1, -1).flatMap((place, intermediateIndex) => {
        const originalIndex = previousPlaces.findIndex(
            (candidate, candidateIndex) =>
                candidate === place &&
                candidateIndex > 0 &&
                candidateIndex < previousPlaces.length - 1 &&
                !usedOriginalIndices.has(candidateIndex),
        );
        if (originalIndex === -1) {
            return [];
        }

        usedOriginalIndices.add(originalIndex);
        const matchingWindow = stopWindowByOriginalIndex.get(originalIndex);
        if (!matchingWindow) {
            return [];
        }

        return [{
            stopIndex: intermediateIndex + 1,
            windowStartMinutes: matchingWindow.windowStartMinutes,
            windowEndMinutes: matchingWindow.windowEndMinutes,
            serviceMinutes: matchingWindow.serviceMinutes,
        }];
    });
};

const wait = (ms: number) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
    });

export interface UseRecalculateRouteOptions {
    onEnqueueSuccess?: (
        data: ComputeRouteQueuedResponse,
        payload: ComputeOrderInput,
    ) => void;
    onEnqueueError?: (
        error: AxiosError,
        payload: ComputeOrderInput,
    ) => void;
    onRecalculationSuccess?: (data: RouteJobStatusResponse) => void;
    onRecalculationFailed?: (data: RouteJobStatusResponse) => void;
    onStatusQueryError?: (error: AxiosError) => void;
}

export const useRecalculateRoute = (
    options: UseRecalculateRouteOptions = {},
) => {
    const {
        onEnqueueSuccess: onEnqueueSuccessOption,
        onEnqueueError: onEnqueueErrorOption,
        onRecalculationSuccess: onRecalculationSuccessOption,
        onRecalculationFailed: onRecalculationFailedOption,
        onStatusQueryError: onStatusQueryErrorOption,
    } = options;

    const routes = useRouteComputationStore((state) => state.bestRoutes);
    const estimatedTime = useRouteComputationStore((state) => state.totalTime);
    const lastRequest = useRouteComputationStore((state) => state.lastRequest);
    const setComputedRouteResult = useRouteComputationStore(
        (state) => state.setComputedRouteResult,
    );

    const routesRef = useRef(routes);
    routesRef.current = routes;
    const estimatedTimeRef = useRef(estimatedTime);
    estimatedTimeRef.current = estimatedTime;

    const [isRecalculating, setIsRecalculating] = useState(false);
    const activeRequestIdRef = useRef(0);
    const recalculationToastIdRef = useRef<Id | null>(null);

    const startRecalculationToast = useCallback(() => {
        if (recalculationToastIdRef.current) {
            notify.dismiss(recalculationToastIdRef.current);
        }
        recalculationToastIdRef.current = notify.loading('Recalculating remaining route...');
    }, []);

    const resolveRecalculationToast = useCallback((
        message: string,
        tone: 'success' | 'error' = 'success',
    ) => {
        if (recalculationToastIdRef.current) {
            notify.resolve(recalculationToastIdRef.current, message, tone);
            recalculationToastIdRef.current = null;
            return;
        }

        if (tone === 'error') {
            notify.error(message);
            return;
        }

        notify.success(message);
    }, []);

    const pollRecalculationStatus = useCallback(async (
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
                        error: statusResponse.error ?? 'Recalculation failed.',
                        bestRoutes: routesRef.current,
                        totalTime: estimatedTimeRef.current,
                    });
                    setIsRecalculating(false);
                    resolveRecalculationToast(
                        statusResponse.error ?? 'Recalculation failed.',
                        'error',
                    );
                    onRecalculationFailedOption?.(statusResponse);
                    return;
                }

                if (statusResponse.status === 'completed' && statusResponse.result) {
                    setComputedRouteResult({
                        status: statusResponse.status,
                        error: statusResponse.error,
                        bestRoutes: toBestRoutes(statusResponse.result, places),
                        totalTime: statusResponse.result.totalTime ?? null,
                    });
                    setIsRecalculating(false);
                    resolveRecalculationToast('Route recalculated.');
                    onRecalculationSuccessOption?.(statusResponse);
                    return;
                }

                setComputedRouteResult({
                    status: statusResponse.status,
                    error: statusResponse.error,
                    bestRoutes: routesRef.current,
                    totalTime: estimatedTimeRef.current,
                });
                await wait(RECALCULATION_STATUS_POLL_INTERVAL_MS);
            } catch (error) {
                if (activeRequestIdRef.current !== requestId) {
                    return;
                }

                const axiosError = error as AxiosError;
                setComputedRouteResult({
                    status: 'failed',
                    error: axiosError.message || 'Failed to check recalculation status.',
                    bestRoutes: routesRef.current,
                    totalTime: estimatedTimeRef.current,
                });
                setIsRecalculating(false);
                resolveRecalculationToast('Recalculation failed.', 'error');
                onStatusQueryErrorOption?.(axiosError);
                return;
            }
        }
    }, [
        onRecalculationFailedOption,
        onRecalculationSuccessOption,
        onStatusQueryErrorOption,
        resolveRecalculationToast,
        setComputedRouteResult,
    ]);

    const onEnqueueSuccess = useCallback((
        response: ComputeRouteQueuedResponse,
        payload: ComputeOrderInput,
        requestId: number,
    ) => {
        setComputedRouteResult({
            status: response.status,
            error: undefined,
            bestRoutes: routesRef.current,
            totalTime: estimatedTimeRef.current,
        });
        onEnqueueSuccessOption?.(response, payload);
        void pollRecalculationStatus(response.jobId, payload.places, requestId);
    }, [
        onEnqueueSuccessOption,
        pollRecalculationStatus,
        setComputedRouteResult,
    ]);

    const onEnqueueError = useCallback((error: AxiosError, payload: ComputeOrderInput) => {
        setComputedRouteResult({
            status: 'failed',
            error: error.message || 'Failed to start recalculation.',
            bestRoutes: routesRef.current,
            totalTime: estimatedTimeRef.current,
        });
        setIsRecalculating(false);
        resolveRecalculationToast('Failed to start recalculation.', 'error');
        onEnqueueErrorOption?.(error, payload);
    }, [
        onEnqueueErrorOption,
        resolveRecalculationToast,
        setComputedRouteResult,
    ]);

    const enqueueRecalculationMutation = useMutation<
        ComputeRouteQueuedResponse,
        AxiosError,
        ComputeOrderInput,
        { requestId: number }
    >({
        mutationFn: enqueueComputeRoute,
        onMutate: () => {
            const requestId = activeRequestIdRef.current + 1;
            activeRequestIdRef.current = requestId;
            setIsRecalculating(true);
            startRecalculationToast();
            return { requestId };
        },
        onSuccess: (response, payload, context) => {
            if (!context || activeRequestIdRef.current !== context.requestId) {
                return;
            }

            onEnqueueSuccess(response, payload, context.requestId);
        },
        onError: (error, payload, context) => {
            if (context && activeRequestIdRef.current !== context.requestId) {
                return;
            }

            onEnqueueError(error, payload);
        },
    });

    const handleDoneAndRecalculate = useCallback(async (completedLegIndex: number) => {
        if (!lastRequest) {
            notify.error('Route request context is missing. Calculate route again first.');
            return;
        }

        const remainingPlaces = buildRemainingPlaces(routesRef.current, completedLegIndex);
        if (remainingPlaces.length < 2) {
            notify.info('All route legs are complete. Nothing to recalculate.');
            return;
        }

        const nextStopWindows = remapStopWindows(
            remainingPlaces,
            lastRequest.places,
            lastRequest.stopWindows,
        );

        try {
            await enqueueRecalculationMutation.mutateAsync({
                places: remainingPlaces,
                stopWindows: nextStopWindows,
                startTimeUtc: new Date().toISOString(),
                travelMode: lastRequest.travelMode,
            });
        } catch {
            // Error toast is handled in mutation onError.
        }
    }, [enqueueRecalculationMutation, lastRequest]);

    return {
        isRecalculating,
        handleDoneAndRecalculate,
    };
};
