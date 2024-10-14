import { toast } from 'react-toastify';
import { apiInstance } from '../../api';
import { useMutation } from '@tanstack/react-query';
import { useEstimatedTimeStore } from '../store/useEstimatedTimeStore';
import { useRoutesStore } from '../store/useRoutesStore';
import { AxiosError } from 'axios';
import { useRequirementsStore } from '../store/useRequirementsStore';


// Define the expected structure of the response from the backend

interface ComputeRouteResponse {
    order: number[];
    totalTime: number;
}



interface ComputePathResult {
    bestRoutes: [string, string][];
    totalTime: number;
}


const computeRoute = async (places: string[], requirements: Requirement[]): Promise<ComputeRouteResponse> => {
    const response = await apiInstance.post<ComputeRouteResponse>(
        'Route/ComputeOrder',
        { places, requirements }
    );
    return response.data;
};


const computePathAndTime = async (places: string[], requirements: Requirement[]): Promise<ComputePathResult> => {
    const result = await computeRoute(places, requirements);

    const bestRoutes: [string, string][] = result.order.slice(0, -1).map((_, i) => {
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

