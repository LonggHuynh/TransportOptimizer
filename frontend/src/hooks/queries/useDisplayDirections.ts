import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useDirectionsStore } from '../store/useDirectionsStore';
import { AxiosError } from 'axios';
import { apiInstance } from '../../api';
import { Coordinate } from '../../models/coordinate';
import { RouteLine } from '../../models/map';
import { toCoordinateKey } from '../../utils/coordinates';
import { notify } from '../../utils/notify';

interface DirectionsResponse {
    distanceMeters?: number;
    durationSeconds?: number;
    coordinates: { latitude: number; longitude: number }[];
}

interface DisplayDirectionsVariables {
    from: Coordinate;
    to: Coordinate;
}

const fetchDirections = async (
    from: Coordinate,
    to: Coordinate,
): Promise<RouteLine | null> => {
    const fromKey = toCoordinateKey(from);
    const toKey = toCoordinateKey(to);
    const response = await apiInstance.get<DirectionsResponse>('directions', {
        params: { from: fromKey, to: toKey },
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

export const useDisplayDirections = (
    options: UseMutationOptions<
        RouteLine | null,
        AxiosError,
        DisplayDirectionsVariables
    > = {},
) => {
    const setDirectionsResponse = useDirectionsStore(
        (state) => state.setDirectionsResponse,
    );

    return useMutation<
        RouteLine | null,
        AxiosError,
        DisplayDirectionsVariables
    >({
        ...options,
        mutationFn: async ({ from, to }: DisplayDirectionsVariables) =>
            fetchDirections(from, to),
        onSuccess: (data, variables, context) => {
            setDirectionsResponse(data);
            options.onSuccess?.(data, variables, context);
        },
        onError: (error, variables, context) => {
            notify.error(`Failed to fetch directions: ${error.message}`);
            options.onError?.(error, variables, context);
        },
    });
};
