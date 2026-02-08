import { useMutation } from '@tanstack/react-query';
import { useDirectionsStore } from '../store/useDirectionsStore';
import { toast } from 'react-toastify';
import { AxiosError } from 'axios';
import { apiInstance } from '../../api';
import { RouteLine } from '../../models/map';

interface DirectionsResponse {
    distanceMeters?: number;
    durationSeconds?: number;
    coordinates: { latitude: number; longitude: number }[];
}

const fetchDirections = async (
    from: string,
    to: string,
): Promise<RouteLine | null> => {
    const response = await apiInstance.get<DirectionsResponse>('directions', {
        params: { from, to },
    });
    const coordinates = response.data.coordinates ?? [];
    if (!coordinates.length) {
        return null;
    }

    return coordinates.map((coord) => ({
        lat: coord.latitude,
        lng: coord.longitude,
    }));
};

export const useDisplayDirections = () => {
    const setDirectionsResponse = useDirectionsStore(
        (state) => state.setDirectionsResponse,
    );

    return useMutation({
        mutationFn: async ({ from, to }: { from: string; to: string }) =>
            fetchDirections(from, to),
        onSuccess: (data) => {
            setDirectionsResponse(data);
        },
        onError: (error: AxiosError) => {
            toast(`Failed to fetch directions: ${error.message}`);
        },
    });
};
