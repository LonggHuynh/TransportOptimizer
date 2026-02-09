import { useCallback } from 'react';
import { UseFormClearErrors, UseFormSetError } from 'react-hook-form';
import { toast } from 'react-toastify';
import { RouteFormValues } from '../components/route-form/types';
import {
    buildPlacesPayload,
    normalizeIntermediateStops,
    toLocalDateTimeFromTime,
    toStopWindows,
    toUtcIsoFromLocalTime,
} from '../components/route-form/utils';
import { TravelMode } from '../models/routeOptions';
import { StopWindow } from '../models/stopWindow';

interface RouteMutationPayload {
    places: string[];
    stopWindows: StopWindow[];
    startTimeUtc: string | null;
    travelMode: TravelMode;
}

interface RouteSubmissionMutation {
    mutateAsync: (payload: RouteMutationPayload) => Promise<unknown>;
}

interface UseRouteFormSubmissionOptions {
    clearErrors: UseFormClearErrors<RouteFormValues>;
    setError: UseFormSetError<RouteFormValues>;
    enqueueMutation: RouteSubmissionMutation;
}

export const useRouteFormSubmission = ({
    clearErrors,
    setError,
    enqueueMutation,
}: UseRouteFormSubmissionOptions) =>
    useCallback(async (values: RouteFormValues): Promise<boolean> => {
        clearErrors();
        const validationMessages: string[] = [];
        const addValidationError = (
            path: Parameters<typeof setError>[0],
            message: string,
        ) => {
            setError(path, { type: 'manual', message });
            validationMessages.push(message);
        };

        const originLabel = values.origin.value.trim();
        if (!originLabel) {
            addValidationError('origin.value', 'Start location is required');
        } else if (!values.origin.coordinateKey) {
            addValidationError('origin.value', 'Start location must be selected from suggestions');
        }

        const destinationValue = values.sameDestination ? values.origin : values.destination;
        const destinationLabel = destinationValue.value.trim();

        if (!destinationLabel) {
            addValidationError('destination.value', 'End location is required');
        } else if (!destinationValue.coordinateKey) {
            addValidationError('destination.value', 'End location must be selected from suggestions');
        }

        const routeStartLocal = toLocalDateTimeFromTime(values.departTimeLocal);
        if (!routeStartLocal) {
            addValidationError('departTimeLocal', 'Depart time is invalid');
        }

        values.stops.forEach((stop, index) => {
            if (!stop.value.trim()) {
                return;
            }

            if (!stop.coordinateKey) {
                addValidationError(
                    `stops.${index}.value`,
                    `Job stop ${index + 1} must be selected from suggestions`,
                );
            }
        });

        const normalizedStops = normalizeIntermediateStops(values.stops, routeStartLocal);
        const stopWindowsForRequest = toStopWindows(normalizedStops);

        const { places, missingStopNumber } = buildPlacesPayload(
            values.origin.coordinateKey,
            destinationValue.coordinateKey,
            normalizedStops,
        );
        if (!places) {
            if (missingStopNumber !== null) {
                addValidationError(
                    `stops.${missingStopNumber - 1}.value`,
                    `Job stop ${missingStopNumber} must be selected from suggestions`,
                );
            } else {
                addValidationError('origin.value', 'Route places are invalid');
            }
        }

        const startTimeUtc = toUtcIsoFromLocalTime(values.departTimeLocal);
        if (!startTimeUtc) {
            addValidationError('departTimeLocal', 'Depart time is invalid');
        }

        if (validationMessages.length > 0) {
            toast.error(validationMessages[0]);
            return false;
        }
        if (!places || !startTimeUtc) {
            toast.error('Route request is invalid');
            return false;
        }

        toast('Calculating');
        try {
            await enqueueMutation.mutateAsync({
                places,
                stopWindows: stopWindowsForRequest,
                startTimeUtc,
                travelMode: values.travelMode,
            });
            return true;
        } catch {
            toast.error('Failed to calculate route');
            return false;
        }
    }, [clearErrors, enqueueMutation, setError]);
