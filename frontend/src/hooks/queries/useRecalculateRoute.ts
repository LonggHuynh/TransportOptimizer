import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Id } from 'react-toastify';
import { StopWindow } from '../../models/stopWindow';
import { useRouteComputationStore } from '../store/useRouteComputationStore';
import {
    ComputeOrderInput,
    ComputeRouteQueuedResponse,
    enqueueComputeRoute,
    fetchRouteStatus,
    RouteJobStatusResponse,
    toBestRoutes,
} from './routeJobApi';
import { notify } from '../../utils/notify';

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

    const [recalculationJobId, setRecalculationJobId] = useState<string | null>(null);
    const [recalculationPlaces, setRecalculationPlaces] = useState<string[]>([]);
    const [handledCompletedJobId, setHandledCompletedJobId] = useState<string | null>(null);
    const [recalculationToastId, setRecalculationToastId] = useState<Id | null>(null);

    const onEnqueueSuccess = useCallback((
        response: ComputeRouteQueuedResponse,
        payload: ComputeOrderInput,
    ) => {
        if (recalculationToastId) {
            notify.dismiss(recalculationToastId);
        }
        setRecalculationJobId(response.jobId);
        setRecalculationPlaces(payload.places);
        setHandledCompletedJobId(null);
        setComputedRouteResult({
            status: response.status,
            error: undefined,
            bestRoutes: routes,
            totalTime: estimatedTime,
        });
        const toastId = notify.loading('Recalculating remaining route...');
        setRecalculationToastId(toastId);
        onEnqueueSuccessOption?.(response, payload);
    }, [
        estimatedTime,
        onEnqueueSuccessOption,
        recalculationToastId,
        routes,
        setComputedRouteResult,
    ]);

    const onEnqueueError = useCallback((error: AxiosError, payload: ComputeOrderInput) => {
        notify.error('Failed to start recalculation.');
        onEnqueueErrorOption?.(error, payload);
    }, [onEnqueueErrorOption]);

    const onRecalculationFailed = useCallback((
        queryData: RouteJobStatusResponse,
        activeJobId: string,
    ) => {
        setComputedRouteResult({
            status: queryData.status,
            error: queryData.error ?? 'Recalculation failed.',
            bestRoutes: routes,
            totalTime: estimatedTime,
        });
        setHandledCompletedJobId(activeJobId);
        if (recalculationToastId) {
            notify.resolve(recalculationToastId, queryData.error ?? 'Recalculation failed.', 'error');
            setRecalculationToastId(null);
        } else {
            notify.error(queryData.error ?? 'Recalculation failed.');
        }
        onRecalculationFailedOption?.(queryData);
    }, [
        estimatedTime,
        onRecalculationFailedOption,
        recalculationToastId,
        routes,
        setComputedRouteResult,
    ]);

    const onRecalculationSuccess = useCallback((
        queryData: RouteJobStatusResponse,
        activeJobId: string,
    ) => {
        if (!queryData.result) {
            return;
        }

        setComputedRouteResult({
            status: queryData.status,
            error: queryData.error,
            bestRoutes: toBestRoutes(queryData.result, recalculationPlaces),
            totalTime: queryData.result.totalTime ?? null,
        });
        setHandledCompletedJobId(activeJobId);
        if (recalculationToastId) {
            notify.resolve(recalculationToastId, 'Route recalculated.');
            setRecalculationToastId(null);
        } else {
            notify.success('Route recalculated.');
        }
        onRecalculationSuccessOption?.(queryData);
    }, [
        onRecalculationSuccessOption,
        recalculationPlaces,
        recalculationToastId,
        setComputedRouteResult,
    ]);

    const enqueueRecalculationMutation = useMutation<ComputeRouteQueuedResponse, AxiosError, ComputeOrderInput>({
        mutationFn: enqueueComputeRoute,
        onSuccess: onEnqueueSuccess,
        onError: onEnqueueError,
    });

    const recalculationStatusQuery = useQuery<RouteJobStatusResponse, AxiosError>({
        queryKey: ['routeRecalculation', recalculationJobId],
        queryFn: () => fetchRouteStatus(recalculationJobId!),
        enabled: Boolean(recalculationJobId),
        refetchOnWindowFocus: false,
        refetchInterval: (query) => {
            const queryStatus = query.state.data?.status;
            if (queryStatus === 'completed' || queryStatus === 'failed') {
                return false;
            }
            return 1000;
        },
    });

    useEffect(() => {
        if (!recalculationStatusQuery.isError) {
            return;
        }

        onStatusQueryErrorOption?.(recalculationStatusQuery.error);
    }, [
        onStatusQueryErrorOption,
        recalculationStatusQuery.error,
        recalculationStatusQuery.isError,
    ]);

    useEffect(() => {
        if (!recalculationJobId) {
            return;
        }

        const queryData = recalculationStatusQuery.data;
        if (!queryData) {
            return;
        }

        if (queryData.status === 'failed') {
            if (handledCompletedJobId === recalculationJobId) {
                return;
            }

            onRecalculationFailed(queryData, recalculationJobId);
            return;
        }

        if (queryData.status !== 'completed' || !queryData.result) {
            return;
        }

        if (handledCompletedJobId === recalculationJobId) {
            return;
        }

        onRecalculationSuccess(queryData, recalculationJobId);
    }, [
        handledCompletedJobId,
        onRecalculationFailed,
        onRecalculationSuccess,
        recalculationJobId,
        recalculationStatusQuery.data,
    ]);

    const recalculationStatus = recalculationStatusQuery.data?.status;
    const isRecalculating = enqueueRecalculationMutation.isPending
        || (Boolean(recalculationJobId)
            && recalculationStatus !== 'completed'
            && recalculationStatus !== 'failed');

    const handleDoneAndRecalculate = useCallback(async (completedLegIndex: number) => {
        if (!lastRequest) {
            notify.error('Route request context is missing. Calculate route again first.');
            return;
        }

        const remainingPlaces = buildRemainingPlaces(routes, completedLegIndex);
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
    }, [enqueueRecalculationMutation, lastRequest, routes]);

    return {
        isRecalculating,
        handleDoneAndRecalculate,
    };
};
