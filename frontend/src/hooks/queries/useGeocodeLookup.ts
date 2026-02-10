import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiInstance } from '../../api';
import { Coordinate } from '../../models/coordinate';

interface GeocodeResponse {
    latitude?: number;
    longitude?: number;
}

export interface GeocodeLookupInput {
    address?: string;
    placeId?: string;
}

const fetchGeocode = async ({
    address,
    placeId,
}: GeocodeLookupInput): Promise<Coordinate | null> => {
    const trimmedAddress = address?.trim();
    const trimmedPlaceId = placeId?.trim();
    if (!trimmedAddress && !trimmedPlaceId) {
        return null;
    }

    const response = await apiInstance.get<GeocodeResponse>('geocode', {
        params: {
            address: trimmedAddress || undefined,
            placeId: trimmedPlaceId || undefined,
        },
    });

    const latitude = response.data.latitude;
    const longitude = response.data.longitude;
    if (
        typeof latitude !== 'number'
        || !Number.isFinite(latitude)
        || typeof longitude !== 'number'
        || !Number.isFinite(longitude)
    ) {
        return null;
    }

    return {
        latitude,
        longitude,
    };
};

export const useGeocodeLookup = (
    options: UseMutationOptions<Coordinate | null, AxiosError, GeocodeLookupInput> = {},
) =>
    useMutation<Coordinate | null, AxiosError, GeocodeLookupInput>({
        ...options,
        mutationFn: fetchGeocode,
    });
