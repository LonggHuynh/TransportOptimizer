import { useCallback, useEffect, useRef, useState } from 'react';
import { UseFormClearErrors } from 'react-hook-form';
import { Id } from 'react-toastify';
import { RouteFormValues } from '../types';
import {
    buildPlacesPayload,
    normalizeIntermediateStops,
    toLocalDateTimeFromTime,
    toStopWindows,
    toUtcIsoFromLocalTime,
} from '../utils';
import { Coordinate } from '../../../models/coordinate';
import { TravelMode } from '../../../models/routeOptions';
import { StopWindow } from '../../../models/stopWindow';
import { notify } from '../../../utils/notify';
import { parseCoordinateKey } from '../../../utils/coordinates';
import { useComputePathAndTime } from '../../../hooks/queries/useComputePathAndTime';
import { useRouteJobStatus } from '../../../hooks/queries/useRouteJobStatus';
import { useRouteComputationStore } from '../../../hooks/store/useRouteComputationStore';

interface RouteMutationPayload {
    places: Coordinate[];
    stopWindows: StopWindow[];
    startTimeUtc: string | null;
    travelMode: TravelMode;
}

interface UseRouteFormSubmissionOptions {
    clearErrors: UseFormClearErrors<RouteFormValues>;
}

const ROUTE_STATUS_POLL_INTERVAL_MS = 1000;

interface ComputeRouteResult {
    order: number[];
    totalTime: number | null;
    bestRoutes?: [string, string][];
}

const toBestRoutes = (
    result: ComputeRouteResult,
    places: Coordinate[],
): [Coordinate, Coordinate][] => {
    if (result.bestRoutes && result.bestRoutes.length > 0) {
        const parsedBestRoutes = result.bestRoutes.flatMap(([from, to]) => {
            const parsedFrom = parseCoordinateKey(from);
            const parsedTo = parseCoordinateKey(to);
            if (!parsedFrom || !parsedTo) {
                return [];
            }

            return [[parsedFrom, parsedTo] as [Coordinate, Coordinate]];
        });

        if (parsedBestRoutes.length > 0) {
            return parsedBestRoutes;
        }
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

export const useRouteFormSubmission = ({
    clearErrors,
}: UseRouteFormSubmissionOptions) => {
    const setComputedRouteResult = useRouteComputationStore(
        (state) => state.setComputedRouteResult,
    );
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [activeJobPlaces, setActiveJobPlaces] = useState<Coordinate[]>([]);
    const submitToastIdRef = useRef<Id | null>(null);

    const resolveSubmitToast = useCallback((
        message: string,
        tone: 'success' | 'error' = 'success',
    ) => {
        if (submitToastIdRef.current) {
            notify.resolve(submitToastIdRef.current, message, tone);
            submitToastIdRef.current = null;
            return;
        }

        if (tone === 'error') {
            notify.error(message);
            return;
        }

        notify.success(message);
    }, []);

    const { enqueueMutation } = useComputePathAndTime({
        onSuccess: (data, variables) => {
            setActiveJobId(data.jobId);
            setActiveJobPlaces(variables.places);
            resolveSubmitToast('Optimization started.');
        },
        onError: () => {
            resolveSubmitToast('Failed to calculate route.', 'error');
            setActiveJobId(null);
            setActiveJobPlaces([]);
        },
    });

    const routeStatusQuery = useRouteJobStatus(activeJobId, {
        refetchOnWindowFocus: false,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === 'completed' || status === 'failed') {
                return false;
            }
            return ROUTE_STATUS_POLL_INTERVAL_MS;
        },
    });

    useEffect(() => {
        if (!activeJobId || !routeStatusQuery.data) {
            return;
        }

        const statusResponse = routeStatusQuery.data;
        if (statusResponse.status === 'completed' && statusResponse.result) {
            setComputedRouteResult({
                status: statusResponse.status,
                error: statusResponse.error,
                bestRoutes: toBestRoutes(statusResponse.result, activeJobPlaces),
                totalTime: statusResponse.result.totalTime ?? null,
            });
            resolveSubmitToast('Route optimized.');
            setActiveJobId(null);
            return;
        }

        if (statusResponse.status === 'failed') {
            setComputedRouteResult({
                status: statusResponse.status,
                error: statusResponse.error ?? 'Failed to calculate route.',
                bestRoutes: [],
                totalTime: null,
            });
            resolveSubmitToast(statusResponse.error ?? 'Failed to calculate route.', 'error');
            setActiveJobId(null);
            return;
        }

        setComputedRouteResult({
            status: statusResponse.status,
            error: statusResponse.error,
            bestRoutes: [],
            totalTime: null,
        });
    }, [
        activeJobId,
        activeJobPlaces,
        resolveSubmitToast,
        routeStatusQuery.data,
        setComputedRouteResult,
    ]);

    useEffect(() => {
        if (!activeJobId || !routeStatusQuery.isError) {
            return;
        }

        setComputedRouteResult({
            status: 'failed',
            error: routeStatusQuery.error.message || 'Failed to check route status.',
            bestRoutes: [],
            totalTime: null,
        });
        resolveSubmitToast('Failed to calculate route.', 'error');
        setActiveJobId(null);
    }, [
        activeJobId,
        resolveSubmitToast,
        routeStatusQuery.error,
        routeStatusQuery.isError,
        setComputedRouteResult,
    ]);

    return useCallback(async (values: RouteFormValues): Promise<boolean> => {
        clearErrors();
        const validationMessages: string[] = [];
        const addValidationError = (message: string) => {
            validationMessages.push(message);
        };

        const originLabel = values.origin.value.trim();
        if (!originLabel) {
            addValidationError('Start location is required');
        } else if (!values.origin.coordinate) {
            addValidationError('Start location must be selected from suggestions');
        }

        const destinationValue = values.sameDestination ? values.origin : values.destination;
        const destinationLabel = destinationValue.value.trim();

        if (!destinationLabel) {
            addValidationError('End location is required');
        } else if (!destinationValue.coordinate) {
            addValidationError('End location must be selected from suggestions');
        }

        const routeStartLocal = toLocalDateTimeFromTime(values.departTimeLocal);
        if (!routeStartLocal) {
            addValidationError('Depart time is invalid');
        }

        values.stops.forEach((stop, index) => {
            if (!stop.value.trim()) {
                return;
            }

            if (!stop.coordinate) {
                addValidationError(`Job stop ${index + 1} must be selected from suggestions`);
            }
        });

        const normalizedStops = normalizeIntermediateStops(values.stops, routeStartLocal);
        const stopWindowsForRequest = toStopWindows(normalizedStops);

        const { places, missingStopNumber } = buildPlacesPayload(
            values.origin.coordinate,
            destinationValue.coordinate,
            normalizedStops,
        );
        if (!places) {
            if (missingStopNumber !== null) {
                addValidationError(`Job stop ${missingStopNumber} must be selected from suggestions`);
            } else {
                addValidationError('Route places are invalid');
            }
        }

        const startTimeUtc = toUtcIsoFromLocalTime(values.departTimeLocal);
        if (!startTimeUtc) {
            addValidationError('Depart time is invalid');
        }

        if (validationMessages.length > 0) {
            notify.error(validationMessages[0]);
            return false;
        }
        if (!places || !startTimeUtc) {
            notify.error('Route request is invalid');
            return false;
        }

        if (submitToastIdRef.current) {
            notify.dismiss(submitToastIdRef.current);
        }
        submitToastIdRef.current = notify.loading('Optimizing route...');

        try {
            await enqueueMutation.mutateAsync({
                places,
                stopWindows: stopWindowsForRequest,
                startTimeUtc,
                travelMode: values.travelMode,
            } as RouteMutationPayload);
            return true;
        } catch {
            return false;
        }
    }, [clearErrors, enqueueMutation, resolveSubmitToast]);
};
