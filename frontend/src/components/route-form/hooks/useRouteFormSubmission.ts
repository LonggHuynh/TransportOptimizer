import { useCallback } from 'react';
import { UseFormClearErrors } from 'react-hook-form';
import { RouteFormValues } from '../types';
import {
    buildPlacesPayload,
    normalizeIntermediateStops,
    toLocalDateTimeFromTime,
    toStopWindows,
    toUtcIsoFromLocalTime,
} from '../utils';
import { TravelMode } from '../../../models/routeOptions';
import { StopWindow } from '../../../models/stopWindow';
import { notify } from '../../../utils/notify';

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
    enqueueMutation: RouteSubmissionMutation;
}

export const useRouteFormSubmission = ({
    clearErrors,
    enqueueMutation,
}: UseRouteFormSubmissionOptions) =>
    useCallback(async (values: RouteFormValues): Promise<boolean> => {
        clearErrors();
        const validationMessages: string[] = [];
        const addValidationError = (message: string) => {
            validationMessages.push(message);
        };

        const originLabel = values.origin.value.trim();
        if (!originLabel) {
            addValidationError('Start location is required');
        } else if (!values.origin.coordinateKey) {
            addValidationError('Start location must be selected from suggestions');
        }

        const destinationValue = values.sameDestination ? values.origin : values.destination;
        const destinationLabel = destinationValue.value.trim();

        if (!destinationLabel) {
            addValidationError('End location is required');
        } else if (!destinationValue.coordinateKey) {
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

            if (!stop.coordinateKey) {
                addValidationError(`Job stop ${index + 1} must be selected from suggestions`);
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

        try {
            await enqueueMutation.mutateAsync({
                places,
                stopWindows: stopWindowsForRequest,
                startTimeUtc,
                travelMode: values.travelMode,
            });
            return true;
        } catch {
            return false;
        }
    }, [clearErrors, enqueueMutation]);
