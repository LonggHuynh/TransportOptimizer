import { QueryOptions, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiInstance } from '../../api';
import { Coordinate } from '../../models/coordinate';

interface ComputeRouteResponse {
    order: number[];
    totalTime: number | null;
    bestRoutes?: [Coordinate, Coordinate][];
}

export interface RouteJobStatusResponse {
    jobId: string;
    status: string;
    result?: ComputeRouteResponse;
    error?: string;
}

const ROUTE_STATUS_POLL_INTERVAL_MS = 1000;

const fetchRouteStatus = async (
    jobId: string,
): Promise<RouteJobStatusResponse> => {
    const response = await apiInstance.get<RouteJobStatusResponse>(
        `Route/ComputeOrder/${jobId}`,
    );
    return response.data;
};

export const useRouteJobStatus = (
    jobId: string | null,
    options: QueryOptions<
        RouteJobStatusResponse,
        AxiosError,
        RouteJobStatusResponse,
        [string, string | null]
    > = {},
) => {
    return useQuery({
        ...options,
        refetchOnWindowFocus: false,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === 'completed' || status === 'failed') {
                return false;
            }
            return ROUTE_STATUS_POLL_INTERVAL_MS;
        },
        queryKey: ['routeJobStatus', jobId],
        queryFn: () => fetchRouteStatus(jobId!),
        enabled: Boolean(jobId),
    });
};
