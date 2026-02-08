import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiInstance } from '../../api';
import { useStopWindowsStore } from '../store/useStopWindowsStore';
import { StopWindow } from '../../models/stopWindow';

interface ComputeRouteResponse {
    order: number[];
    totalTime: number | null;
    bestRoutes?: [string, string][];
}

interface ComputeRouteQueuedResponse {
    jobId: string;
    status: string;
}

interface RouteJobStatusResponse {
    jobId: string;
    status: string;
    result?: ComputeRouteResponse;
    error?: string;
}

interface RouteComputationResult {
    status?: string;
    error?: string;
    bestRoutes: [string, string][];
    totalTime: number | null;
}

const enqueueComputeRoute = async (places: string[], stopWindows: StopWindow[]): Promise<ComputeRouteQueuedResponse> => {
    const response = await apiInstance.post<ComputeRouteQueuedResponse>(
        'Route/ComputeOrder',
        { places, stopWindows }
    );
    return response.data;
};

const fetchRouteStatus = async (jobId: string): Promise<RouteJobStatusResponse> => {
    const response = await apiInstance.get<RouteJobStatusResponse>(`Route/ComputeOrder/${jobId}`);
    return response.data;
};

export const useComputePathAndTime = () => {
    const stopWindows = useStopWindowsStore((state) => state.stopWindows);
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobPlaces, setJobPlaces] = useState<string[]>([]);

    const jobQuery = useQuery(
        {
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
        }
    );

    const enqueueMutation = useMutation(
        {
            mutationFn: async ({ places }: { places: string[] }) => enqueueComputeRoute(places, stopWindows),
            onSuccess: (data, variables) => {
                setJobId(data.jobId);
                setJobPlaces(variables.places);
            },
        }
    );

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
