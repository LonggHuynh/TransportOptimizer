import { useCallback, useEffect, useRef, useState } from 'react';
import { Id } from 'react-toastify';
import { Coordinate } from '../../../models/coordinate';
import { StopWindow } from '../../../models/stopWindow';
import { notify } from '../../../utils/notify';
import { toCoordinateKey } from '../../../utils/coordinates';
import { useRouteJobStatus } from '../../../hooks/queries/useRouteJobStatus';
import { useRecalculateRoute } from '../../../hooks/queries/useRecalculateRoute';
import { useRouteComputationStore } from '../../../hooks/store/useRouteComputationStore';

const RECALCULATION_STATUS_POLL_INTERVAL_MS = 1000;

interface ComputeRouteResult {
    order: number[];
    totalTime: number | null;
    bestRoutes?: [Coordinate, Coordinate][];
}

const toBestRoutes = (
    result: ComputeRouteResult,
    places: Coordinate[],
): [Coordinate, Coordinate][] => {
    if (result.bestRoutes && result.bestRoutes.length > 0) {
        return result.bestRoutes;
    }

    return result.order.slice(0, -1).flatMap((_, index) => {
        const from = places[result.order[index]];
        const to = places[result.order[index + 1]];
        if (!from || !to) {
            return [];
        }

        return [[from, to] as [Coordinate, Coordinate]];
    });
};

const buildRemainingPlaces = (
    bestRoutes: [Coordinate, Coordinate][],
    completedLegIndex: number,
) => {
    const completedLeg = bestRoutes[completedLegIndex];
    if (!completedLeg) {
        return [] as Coordinate[];
    }

    const [_, nextOrigin] = completedLeg;
    const remainingDestinations = bestRoutes
        .slice(completedLegIndex + 1)
        .map((leg) => leg[1]);

    return [nextOrigin, ...remainingDestinations];
};

const remapStopWindows = (
    nextPlaces: Coordinate[],
    previousPlaces: Coordinate[],
    previousStopWindows: StopWindow[],
) => {
    if (nextPlaces.length < 3 || previousStopWindows.length === 0) {
        return [] as StopWindow[];
    }

    const stopWindowByOriginalIndex = new Map<number, StopWindow>(
        previousStopWindows.map((window) => [window.stopIndex, window]),
    );
    const usedOriginalIndices = new Set<number>();
    const previousPlaceKeys = previousPlaces.map((place) => toCoordinateKey(place));
    const nextPlaceKeys = nextPlaces.map((place) => toCoordinateKey(place));

    return nextPlaceKeys.slice(1, -1).flatMap((placeKey, intermediateIndex) => {
        const originalIndex = previousPlaceKeys.findIndex(
            (candidateKey, candidateIndex) =>
                candidateKey === placeKey &&
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

export const useRouteRecalculation = () => {
    const routes = useRouteComputationStore((state) => state.bestRoutes);
    const estimatedTime = useRouteComputationStore((state) => state.totalTime);
    const lastRequest = useRouteComputationStore((state) => state.lastRequest);
    const setComputedRouteResult = useRouteComputationStore(
        (state) => state.setComputedRouteResult,
    );

    const [recalculationJobId, setRecalculationJobId] = useState<string | null>(null);
    const [recalculationPlaces, setRecalculationPlaces] = useState<Coordinate[]>([]);
    const recalculationToastIdRef = useRef<Id | null>(null);

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

    const enqueueRecalculationMutation = useRecalculateRoute({
        onSuccess: (response, payload) => {
            setRecalculationJobId(response.jobId);
            setRecalculationPlaces(payload.places);
            if (recalculationToastIdRef.current) {
                notify.dismiss(recalculationToastIdRef.current);
            }
            recalculationToastIdRef.current = notify.loading('Recalculating remaining route...');
        },
        onError: () => {
            resolveRecalculationToast('Failed to start recalculation.', 'error');
        },
    });

    const recalculationStatusQuery = useRouteJobStatus(recalculationJobId, {
        refetchOnWindowFocus: false,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === 'completed' || status === 'failed') {
                return false;
            }
            return RECALCULATION_STATUS_POLL_INTERVAL_MS;
        },
    });

    useEffect(() => {
        if (!recalculationJobId || !recalculationStatusQuery.data) {
            return;
        }

        const statusResponse = recalculationStatusQuery.data;

        if (statusResponse.status === 'completed' && statusResponse.result) {
            setComputedRouteResult({
                status: statusResponse.status,
                error: statusResponse.error,
                bestRoutes: toBestRoutes(statusResponse.result, recalculationPlaces),
                totalTime: statusResponse.result.totalTime ?? null,
            });
            resolveRecalculationToast('Route recalculated.');
            setRecalculationJobId(null);
            return;
        }

        if (statusResponse.status === 'failed') {
            setComputedRouteResult({
                status: statusResponse.status,
                error: statusResponse.error ?? 'Recalculation failed.',
                bestRoutes: routes,
                totalTime: estimatedTime,
            });
            resolveRecalculationToast(statusResponse.error ?? 'Recalculation failed.', 'error');
            setRecalculationJobId(null);
            return;
        }

        setComputedRouteResult({
            status: statusResponse.status,
            error: statusResponse.error,
            bestRoutes: routes,
            totalTime: estimatedTime,
        });
    }, [
        estimatedTime,
        recalculationJobId,
        recalculationPlaces,
        recalculationStatusQuery.data,
        resolveRecalculationToast,
        routes,
        setComputedRouteResult,
    ]);

    useEffect(() => {
        if (!recalculationJobId || !recalculationStatusQuery.isError) {
            return;
        }

        setComputedRouteResult({
            status: 'failed',
            error: recalculationStatusQuery.error.message || 'Failed to check recalculation status.',
            bestRoutes: routes,
            totalTime: estimatedTime,
        });
        resolveRecalculationToast('Recalculation failed.', 'error');
        setRecalculationJobId(null);
    }, [
        estimatedTime,
        recalculationJobId,
        recalculationStatusQuery.error,
        recalculationStatusQuery.isError,
        resolveRecalculationToast,
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
            // Error toast is handled by the mutation hook.
        }
    }, [enqueueRecalculationMutation, lastRequest, routes]);

    return {
        isRecalculating,
        handleDoneAndRecalculate,
    };
};
