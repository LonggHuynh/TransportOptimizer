import { apiInstance } from '../../api';
import { TravelMode } from '../../models/routeOptions';
import { StopWindow } from '../../models/stopWindow';

export interface ComputeRouteResponse {
    order: number[];
    totalTime: number | null;
    bestRoutes?: [string, string][];
}

export interface ComputeRouteQueuedResponse {
    jobId: string;
    status: string;
}

export interface RouteJobStatusResponse {
    jobId: string;
    status: string;
    result?: ComputeRouteResponse;
    error?: string;
}

export interface ComputeOrderInput {
    places: string[];
    stopWindows: StopWindow[];
    startTimeUtc: string | null;
    travelMode: TravelMode;
}

export const enqueueComputeRoute = async ({
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

export const fetchRouteStatus = async (
    jobId: string,
): Promise<RouteJobStatusResponse> => {
    const response = await apiInstance.get<RouteJobStatusResponse>(
        `Route/ComputeOrder/${jobId}`,
    );
    return response.data;
};

export const toBestRoutes = (
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
