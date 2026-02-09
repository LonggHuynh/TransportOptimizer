import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useDirectionsStore } from '../store/useDirectionsStore';
import { AxiosError } from 'axios';
import { apiInstance } from '../../api';
import { RouteLine } from '../../models/map';
import { notify } from '../../utils/notify';

interface DirectionsResponse {
    distanceMeters?: number;
    durationSeconds?: number;
    coordinates: { latitude: number; longitude: number }[];
}

interface DisplayDirectionsVariables {
    from: string;
    to: string;
}

export interface UseDisplayDirectionsOptions {
    onSuccess?: (
        data: RouteLine | null,
        variables: DisplayDirectionsVariables,
    ) => void;
    onError?: (
        error: AxiosError,
        variables: DisplayDirectionsVariables,
    ) => void;
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

export const useDisplayDirections = (
    options: UseDisplayDirectionsOptions = {},
) => {
    const { onSuccess: onSuccessOption, onError: onErrorOption } = options;
    const setDirectionsResponse = useDirectionsStore(
        (state) => state.setDirectionsResponse,
    );

    const onSuccess = useCallback((
        data: RouteLine | null,
        variables: DisplayDirectionsVariables,
    ) => {
        setDirectionsResponse(data);
        onSuccessOption?.(data, variables);
    }, [onSuccessOption, setDirectionsResponse]);

    const onError = useCallback((error: AxiosError, variables: DisplayDirectionsVariables) => {
        notify.error(`Failed to fetch directions: ${error.message}`);
        onErrorOption?.(error, variables);
    }, [onErrorOption]);

    return useMutation<RouteLine | null, AxiosError, DisplayDirectionsVariables>({
        mutationFn: async ({ from, to }: DisplayDirectionsVariables) =>
            fetchDirections(from, to),
        onSuccess,
        onError,
    });
};
