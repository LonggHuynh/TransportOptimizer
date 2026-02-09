import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { StopWindow } from '../../models/stopWindow';
import { useRouteComputationStore } from '../store/useRouteComputationStore';
import {
    enqueueComputeRoute,
    fetchRouteStatus,
    toBestRoutes,
} from './routeJobApi';

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

export const useRecalculateRoute = () => {
    const routes = useRouteComputationStore((state) => state.bestRoutes);
    const estimatedTime = useRouteComputationStore((state) => state.totalTime);
    const lastRequest = useRouteComputationStore((state) => state.lastRequest);
    const setComputedRouteResult = useRouteComputationStore(
        (state) => state.setComputedRouteResult,
    );

    const [recalculationJobId, setRecalculationJobId] = useState<string | null>(null);
    const [recalculationPlaces, setRecalculationPlaces] = useState<string[]>([]);
    const [handledCompletedJobId, setHandledCompletedJobId] = useState<string | null>(null);

    const enqueueRecalculationMutation = useMutation({
        mutationFn: enqueueComputeRoute,
        onSuccess: (response, payload) => {
            setRecalculationJobId(response.jobId);
            setRecalculationPlaces(payload.places);
            setHandledCompletedJobId(null);
            setComputedRouteResult({
                status: response.status,
                error: undefined,
                bestRoutes: routes,
                totalTime: estimatedTime,
            });
            toast.success('Marked done. Recalculating route...');
        },
        onError: () => {
            toast.error('Failed to start recalculation.');
        },
    });

    const recalculationStatusQuery = useQuery({
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

            setComputedRouteResult({
                status: queryData.status,
                error: queryData.error ?? 'Recalculation failed.',
                bestRoutes: routes,
                totalTime: estimatedTime,
            });
            setHandledCompletedJobId(recalculationJobId);
            toast.error(queryData.error ?? 'Recalculation failed.');
            return;
        }

        if (queryData.status !== 'completed' || !queryData.result) {
            return;
        }

        if (handledCompletedJobId === recalculationJobId) {
            return;
        }

        setComputedRouteResult({
            status: queryData.status,
            error: queryData.error,
            bestRoutes: toBestRoutes(queryData.result, recalculationPlaces),
            totalTime: queryData.result.totalTime ?? null,
        });
        setHandledCompletedJobId(recalculationJobId);
        toast.success('Route recalculated.');
    }, [
        estimatedTime,
        handledCompletedJobId,
        recalculationJobId,
        recalculationPlaces,
        recalculationStatusQuery.data,
        routes,
        setComputedRouteResult,
    ]);

    const recalculationStatus = recalculationStatusQuery.data?.status;
    const isRecalculating = enqueueRecalculationMutation.isPending
        || (Boolean(recalculationJobId)
            && recalculationStatus !== 'completed'
            && recalculationStatus !== 'failed');

    const handleDoneAndRecalculate = useCallback(async (completedLegIndex: number) => {
        if (!lastRequest) {
            toast.error('Route request context is missing. Calculate route again first.');
            return;
        }

        const remainingPlaces = buildRemainingPlaces(routes, completedLegIndex);
        if (remainingPlaces.length < 2) {
            toast.info('All route legs are complete. Nothing to recalculate.');
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
