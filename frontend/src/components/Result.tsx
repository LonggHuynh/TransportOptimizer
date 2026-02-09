import React, { useEffect, useState } from 'react';
import Draggable from 'react-draggable';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import RouteDetails from './RouteDetails';
import { useRouteComputationStore } from '../hooks/store/useRouteComputationStore';
import { apiInstance } from '../api';
import { StopWindow } from '../models/stopWindow';
import { TravelMode } from '../models/routeOptions';

import './Result.scss';

type ResultTone = 'idle' | 'working' | 'success' | 'error';

interface ComputeRouteResponse {
    order: number[];
    totalTime: number | null;
    bestRoutes?: [string, string][];
}

interface ComputeRouteQueuedResponse {
    jobId: string;
    status: string;
}

interface RouteJobStatusResponse {
    jobId: string;
    status: string;
    result?: ComputeRouteResponse;
    error?: string;
}

interface RecalculatePayload {
    places: string[];
    stopWindows: StopWindow[];
    startTimeUtc: string | null;
    travelMode: TravelMode;
}

const enqueueComputeRoute = async ({
    places,
    stopWindows,
    startTimeUtc,
    travelMode,
}: RecalculatePayload): Promise<ComputeRouteQueuedResponse> => {
    const response = await apiInstance.post<ComputeRouteQueuedResponse>(
        'Route/ComputeOrder',
        {
            places,
            stopWindows,
            startTimeUtc,
            travelMode,
        },
    );
    return response.data;
};

const fetchRouteStatus = async (jobId: string): Promise<RouteJobStatusResponse> => {
    const response = await apiInstance.get<RouteJobStatusResponse>(
        `Route/ComputeOrder/${jobId}`,
    );
    return response.data;
};

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

const toBestRoutes = (
    result: ComputeRouteResponse,
    places: string[],
): [string, string][] => {
    if (result.bestRoutes && result.bestRoutes.length > 0) {
        return result.bestRoutes;
    }

    return result.order.slice(0, -1).flatMap((_, index) => {
        const from = places[result.order[index]];
        const to = places[result.order[index + 1]];
        if (!from || !to) {
            return [];
        }

        return [[from, to] as [string, string]];
    });
};

const getStatusMeta = ({
    status,
    error,
    hasResult,
    isComputing,
}: {
    status?: string;
    error?: string;
    hasResult: boolean;
    isComputing: boolean;
}): { label: string; tone: ResultTone } => {
    if (error || status === 'failed') {
        return { label: 'Failed', tone: 'error' };
    }

    if (isComputing) {
        return { label: 'Optimizing', tone: 'working' };
    }

    if (hasResult) {
        return { label: 'Ready', tone: 'success' };
    }

    return { label: 'Waiting', tone: 'idle' };
};

const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds <= 0) {
        return '—';
    }

    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (!hours) {
        return `${minutes} min`;
    }

    return `${hours}h ${remainingMinutes.toString().padStart(2, '0')}m`;
};

const Result = () => {
    const routes = useRouteComputationStore((state) => state.bestRoutes);
    const estimatedTime = useRouteComputationStore((state) => state.totalTime);
    const status = useRouteComputationStore((state) => state.status);
    const error = useRouteComputationStore((state) => state.error);
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

    const shouldShowResultPanel = Boolean(status || error);
    if (!shouldShowResultPanel) {
        return null;
    }

    const hasResult = status === 'completed' && estimatedTime !== null;
    const isComputing = status === 'queued' || status === 'processing';
    const statusMeta = getStatusMeta({ status, error, hasResult, isComputing });
    const routeLegCount = routes.length;
    const duration = formatDuration(estimatedTime);
    const recalculationStatus = recalculationStatusQuery.data?.status;
    const isRecalculating = enqueueRecalculationMutation.isPending
        || (Boolean(recalculationJobId)
            && recalculationStatus !== 'completed'
            && recalculationStatus !== 'failed');

    const handleDoneAndRecalculate = async (completedLegIndex: number) => {
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
    };

    return (
        <Draggable
            handle=".panel-handle"
            cancel="input,textarea,button,select,option,.MuiSwitch-root,.MuiAutocomplete-root,.MuiAutocomplete-popper,.MuiAutocomplete-option"
            bounds="parent"
        >
            <div className="draggable-panel dragPanel dragPanel--result">
                <div className="result">
                    <div className="panel-handle panel-handle--compact">
                        <span className="panel-handle__label">
                            <span className="panel-handle__grip" aria-hidden="true">::</span>
                            Optimization Results
                        </span>
                        <span className="panel-handle__hint">Drag</span>
                    </div>

                    <header className="result__header">
                        <p className="result__eyebrow">Dispatch Planner</p>
                        <h1 className="result__title">Optimization Results</h1>
                        <span
                            className={`result__status result__status--${statusMeta.tone}`}
                        >
                            {statusMeta.label}
                        </span>
                    </header>

                    <section className="result__metric" aria-live="polite">
                        <p className="result__metric-label">Estimated Drive Time</p>
                        <p className="result__metric-value">{duration}</p>
                        <p className="result__metric-note">
                            {routeLegCount > 0
                                ? `${routeLegCount} route leg${routeLegCount === 1 ? '' : 's'} available`
                                : 'No route legs available yet'}
                        </p>
                    </section>

                    {error && <p className="result__message result__message--error">{error}</p>}
                    {isComputing && (
                        <p className="result__message result__message--loading">
                            Optimizing stop order...
                        </p>
                    )}
                    {!isComputing && status === 'completed' && !hasResult && (
                        <p className="result__message">No feasible route found.</p>
                    )}

                    {hasResult && (
                        <section className="result__routes">
                            <div className="result__routes-head">
                                <h2>Route Breakdown</h2>
                                <span>{routeLegCount}</span>
                            </div>
                            {routeLegCount > 1 && (
                                <p className="result__routes-hint">
                                    Use <strong>Done &amp; recalc</strong> on the current leg when a stop is completed.
                                </p>
                            )}
                            <div className="result__route-list">
                                {routes.map((route, index) => (
                                    <RouteDetails
                                        route={route}
                                        index={index + 1}
                                        canMarkDone={index === 0 && routeLegCount > 1}
                                        onMarkDone={() => handleDoneAndRecalculate(index)}
                                        isRecalculating={isRecalculating}
                                        key={`${route[0]}-${route[1]}-${index}`}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </Draggable>
    );
};

export default Result;
