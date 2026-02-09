import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { fetchRouteStatus, RouteJobStatusResponse } from './routeJobApi';

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
