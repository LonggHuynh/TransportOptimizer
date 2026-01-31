import { toast } from 'react-toastify';
import { apiInstance } from '../../api';
import { useMutation } from '@tanstack/react-query';
import { useEstimatedTimeStore } from '../store/useEstimatedTimeStore';
import { useRoutesStore } from '../store/useRoutesStore';
import { AxiosError } from 'axios';
import { useRequirementsStore } from '../store/useRequirementsStore';



interface ComputeRouteResponse {
    order: number[];
    totalTime: number;
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


interface ComputePathResult {
    bestRoutes: [string, string][];
    totalTime: number;
}


const enqueueComputeRoute = async (places: string[], requirements: Requirement[]): Promise<ComputeRouteQueuedResponse> => {
    const response = await apiInstance.post<ComputeRouteQueuedResponse>(
        'Route/ComputeOrder',
        { places, requirements }
    );
    return response.data;
};

const pollRouteResult = async (jobId: string): Promise<ComputeRouteResponse> => {
    const maxAttempts = 120;
    const delayMs = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const response = await apiInstance.get<RouteJobStatusResponse>(`Route/ComputeOrder/${jobId}`);
        const status = response.data.status;
        if (status === 'completed' && response.data.result) {
            return response.data.result;
        }
        if (status === 'failed') {
            throw new Error(response.data.error || 'Route computation failed');
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error('Route computation timed out');
};

const computePathAndTime = async (places: string[], requirements: Requirement[]): Promise<ComputePathResult> => {
    const queued = await enqueueComputeRoute(places, requirements);
    const result = await pollRouteResult(queued.jobId);

    const bestRoutes: [string, string][] = result.bestRoutes
        ?? result.order.slice(0, -1).map((_, i) => {
            return [places[result.order[i]], places[result.order[i + 1]]];
        });

    return {
        bestRoutes,
        totalTime: result.totalTime,
    };
};


export const useComputePathAndTime = () => {
    const setEstimatedTime = useEstimatedTimeStore((state) => state.setEstimatedTime);
    const setRoutes = useRoutesStore((state) => state.setRoutes);
    const requirements = useRequirementsStore((state) => state.requirements);

    return useMutation(
        {
            mutationFn: async ({ places }: { places: string[] }) => {
                const result = await toast.promise(computePathAndTime(places, requirements), { pending: "Computing best route" });
                return result;
            },
            onSuccess: (data: ComputePathResult) => {
                const { bestRoutes, totalTime } = data;
                if (totalTime) {
                    toast('Routes computed');
                    setEstimatedTime(totalTime);
                    setRoutes(bestRoutes);
                } else {
                    toast('No routes available');
                }
            },
            onError: (error: AxiosError) => {
                toast(error.message);
            },
        }
    )
};
