import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiInstance } from '../../api';
import { TravelMode } from '../../models/routeOptions';
import { StopWindow } from '../../models/stopWindow';
import { useRouteComputationStore } from '../store/useRouteComputationStore';

export interface ComputeRouteQueuedResponse {
    jobId: string;
    status: string;
}

export interface ComputeOrderInput {
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
}: ComputeOrderInput): Promise<ComputeRouteQueuedResponse> => {
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

type ComputeRouteMutationOptions = Omit<
    UseMutationOptions<ComputeRouteQueuedResponse, AxiosError, ComputeOrderInput>,
    'mutationFn'
>;

export const useComputePathAndTime = (
    options: ComputeRouteMutationOptions = {},
) => {
    const setComputedRouteResult = useRouteComputationStore(
        (state) => state.setComputedRouteResult,
    );
    const setLastRequest = useRouteComputationStore((state) => state.setLastRequest);
    const { onSuccess, onError, ...mutationOptions } = options;

    const enqueueMutation = useMutation<
        ComputeRouteQueuedResponse,
        AxiosError,
        ComputeOrderInput
    >({
        mutationFn: enqueueComputeRoute,
        ...mutationOptions,
        onSuccess: (data, variables, context) => {
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
            onSuccess?.(data, variables, context);
        },
        onError: (error, variables, context) => {
            setComputedRouteResult({
                status: 'failed',
                error: error.message || 'Failed to start route optimization.',
                bestRoutes: [],
                totalTime: null,
            });
            onError?.(error, variables, context);
        },
    });

    return { enqueueMutation };
};
