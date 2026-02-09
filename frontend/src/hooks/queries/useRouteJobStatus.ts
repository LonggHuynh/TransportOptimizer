import { useQuery, UseQueryOptions } from '@tanstack/react-query';
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

const fetchRouteStatus = async (
    jobId: string,
): Promise<RouteJobStatusResponse> => {
    const response = await apiInstance.get<RouteJobStatusResponse>(
        `Route/ComputeOrder/${jobId}`,
    );
    return response.data;
};

type RouteJobStatusQueryOptions = Omit<
    UseQueryOptions<RouteJobStatusResponse, AxiosError, RouteJobStatusResponse, [string, string | null]>,
    'queryKey' | 'queryFn'
>;

export const useRouteJobStatus = (
    jobId: string | null,
    options: RouteJobStatusQueryOptions = {},
) =>
    useQuery<RouteJobStatusResponse, AxiosError, RouteJobStatusResponse, [string, string | null]>({
        ...options,
        queryKey: ['routeJobStatus', jobId],
        queryFn: () => fetchRouteStatus(jobId!),
        enabled: jobId ? options.enabled : false,
    });
