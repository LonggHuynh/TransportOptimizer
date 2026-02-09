import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useRouteComputationStore } from '../store/useRouteComputationStore';
import {
    ComputeOrderInput,
    ComputeRouteQueuedResponse,
    enqueueComputeRoute,
    fetchRouteStatus,
    RouteJobStatusResponse,
} from './routeJobApi';

interface RouteComputationResult {
    status?: string;
    error?: string;
    bestRoutes: [string, string][];
    totalTime: number | null;
}

export interface UseComputePathAndTimeOptions {
    onEnqueueSuccess?: (
        data: ComputeRouteQueuedResponse,
        variables: ComputeOrderInput,
    ) => void;
    onEnqueueError?: (
        error: AxiosError,
        variables: ComputeOrderInput,
    ) => void;
    onJobStatusSuccess?: (data: RouteJobStatusResponse) => void;
    onJobStatusError?: (error: AxiosError) => void;
}

export const useComputePathAndTime = (
    options: UseComputePathAndTimeOptions = {},
) => {
    const {
        onEnqueueSuccess: onEnqueueSuccessOption,
        onEnqueueError: onEnqueueErrorOption,
        onJobStatusSuccess: onJobStatusSuccessOption,
        onJobStatusError: onJobStatusErrorOption,
    } = options;
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobPlaces, setJobPlaces] = useState<string[]>([]);
    const setLastRequest = useRouteComputationStore((state) => state.setLastRequest);

    const onEnqueueSuccess = useCallback((
        data: ComputeRouteQueuedResponse,
        variables: ComputeOrderInput,
    ) => {
        setJobId(data.jobId);
        setJobPlaces(variables.places);
        setLastRequest({
            places: variables.places,
            stopWindows: variables.stopWindows,
            startTimeUtc: variables.startTimeUtc,
            travelMode: variables.travelMode,
        });
        onEnqueueSuccessOption?.(data, variables);
    }, [onEnqueueSuccessOption, setLastRequest]);

    const onEnqueueError = useCallback((error: AxiosError, variables: ComputeOrderInput) => {
        onEnqueueErrorOption?.(error, variables);
    }, [onEnqueueErrorOption]);

    const onJobStatusSuccess = useCallback((data: RouteJobStatusResponse) => {
        onJobStatusSuccessOption?.(data);
    }, [onJobStatusSuccessOption]);

    const onJobStatusError = useCallback((error: AxiosError) => {
        onJobStatusErrorOption?.(error);
    }, [onJobStatusErrorOption]);

    const jobQuery = useQuery<RouteJobStatusResponse, AxiosError>({
        queryKey: ['routeJob', jobId],
        queryFn: () => fetchRouteStatus(jobId!),
        enabled: Boolean(jobId),
        refetchOnWindowFocus: false,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status === 'completed' || status === 'failed') {
                return false;
            }
            return 1000;
        },
    });

    const enqueueMutation = useMutation<ComputeRouteQueuedResponse, AxiosError, ComputeOrderInput>({
        mutationFn: enqueueComputeRoute,
        onSuccess: onEnqueueSuccess,
        onError: onEnqueueError,
    });

    useEffect(() => {
        if (!jobQuery.isSuccess) {
            return;
        }

        onJobStatusSuccess(jobQuery.data);
    }, [jobQuery.data, jobQuery.isSuccess, onJobStatusSuccess]);

    useEffect(() => {
        if (!jobQuery.isError) {
            return;
        }

        onJobStatusError(jobQuery.error);
    }, [jobQuery.error, jobQuery.isError, onJobStatusError]);

    const computedResult = useMemo<RouteComputationResult>(() => {
        const status = jobQuery.data?.status;
        const error = jobQuery.data?.error;
        if (status !== 'completed' || !jobQuery.data?.result) {
            return {
                status,
                error,
                totalTime: null,
                bestRoutes: [],
            };
        }

        const result = jobQuery.data.result;
        const bestRoutes: [string, string][] = result.bestRoutes
            ?? result.order.slice(0, -1).map((_, i) => {
                return [jobPlaces[result.order[i]], jobPlaces[result.order[i + 1]]];
            });

        return {
            status,
            error,
            totalTime: result.totalTime ?? null,
            bestRoutes,
        };
    }, [jobPlaces, jobQuery.data]);

    return {
        enqueueMutation,
        jobQuery,
        computedResult,
    };
};
