import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiInstance } from '../../api';
import { TravelMode } from '../../models/routeOptions';
import { StopWindow } from '../../models/stopWindow';
import { notify } from '../../utils/notify';
import { useRouteComputationStore } from '../store/useRouteComputationStore';

interface ComputeRouteQueuedResponse {
    jobId: string;
    status: string;
}

interface ComputeOrderInput {
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

type RecalculateRouteMutationOptions = Omit<
    UseMutationOptions<ComputeRouteQueuedResponse, AxiosError, ComputeOrderInput>,
    'mutationFn'
>;

export const useRecalculateRoute = (
    options: RecalculateRouteMutationOptions = {},
) => {
    const routes = useRouteComputationStore((state) => state.bestRoutes);
    const estimatedTime = useRouteComputationStore((state) => state.totalTime);
    const setComputedRouteResult = useRouteComputationStore(
        (state) => state.setComputedRouteResult,
    );
    const { onSuccess, onError, ...mutationOptions } = options;

    return useMutation<ComputeRouteQueuedResponse, AxiosError, ComputeOrderInput>({
        mutationFn: enqueueComputeRoute,
        ...mutationOptions,
        onSuccess: (data, variables, context) => {
            setComputedRouteResult({
                status: data.status,
                error: undefined,
                bestRoutes: routes,
                totalTime: estimatedTime,
            });
            onSuccess?.(data, variables, context);
        },
        onError: (error, variables, context) => {
            notify.error('Failed to start recalculation.');
            onError?.(error, variables, context);
        },
    });
};
