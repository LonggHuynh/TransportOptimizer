import { QueryOptions, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiInstance } from '../../api';
import { LatLng } from '../../models/map';

export interface GeocodeSuggestion {
    id: string;
    label: string;
    placeId?: string;
}

const MIN_QUERY_LENGTH = 3;
const SUGGESTION_LIMIT = 6;

interface SuggestionRecord {
    id?: string | null;
    label?: string | null;
    placeId?: string | null;
    place_id?: string | null;
    description?: string | null;
    text?: string | null;
}

type SuggestionPayload = string | SuggestionRecord | null | undefined;
type GeocodeSuggestionsResponse = SuggestionPayload[];

type GeocodeSuggestionsQueryOptions = Omit<
    UseQueryOptions<
        GeocodeSuggestionsResponse,
        AxiosError,
        GeocodeSuggestion[],
        [string, string, string, string]
    >,
    'queryKey' | 'queryFn' | 'enabled' | 'select'
>;

const isRecord = (value: SuggestionPayload): value is SuggestionRecord =>
    typeof value === 'object' && value !== null;

const parseSuggestion = (
    input: SuggestionPayload,
    index: number,
): GeocodeSuggestion | null => {
    if (typeof input === 'string') {
        const label = input.trim();
        if (!label) {
            return null;
        }

        return {
            id: `${label}-${index}`,
            label,
        };
    }

    if (!isRecord(input)) {
        return null;
    }

    const rawLabel = input.label ?? input.description ?? input.text;
    if (typeof rawLabel !== 'string') {
        return null;
    }

    const label = rawLabel.trim();
    if (!label) {
        return null;
    }

    const rawPlaceId = input.placeId ?? input.place_id;
    const placeId =
        typeof rawPlaceId === 'string' && rawPlaceId.trim()
            ? rawPlaceId.trim()
            : undefined;
    const id =
        placeId ??
        (typeof input.id === 'string' && input.id.trim()
            ? input.id.trim()
            : `${label}-${index}`);

    return {
        id,
        label,
        placeId,
    };
};

const parseSuggestions = (
    data: GeocodeSuggestionsResponse | null | undefined,
): GeocodeSuggestion[] => {
    const payload = Array.isArray(data) ? data : [];
    const dedupe = new Map<string, GeocodeSuggestion>();

    payload.forEach((item, index) => {
        const parsed = parseSuggestion(item, index);
        if (!parsed) {
            return;
        }

        const dedupeKey = parsed.placeId
            ? `place:${parsed.placeId.toLowerCase()}`
            : `label:${parsed.label.toLowerCase()}`;
        if (!dedupe.has(dedupeKey)) {
            dedupe.set(dedupeKey, parsed);
        }
    });

    return Array.from(dedupe.values());
};

const fetchSuggestions = async ({
    query,
    signal,
    centerLat,
    centerLng,
}: {
    query: string;
    signal: AbortSignal;
    centerLat?: number;
    centerLng?: number;
}) => {
    const response = await apiInstance.get<GeocodeSuggestionsResponse>('geocode/suggest', {
        params: {
            query,
            limit: SUGGESTION_LIMIT,
            centerLat,
            centerLng,
        },
        signal,
    });
    return response.data;
};

export const useGeocodeSuggestions = (
    query: string,
    center?: LatLng | null,
) => {
    const trimmedQuery = query.trim();
    const canSearch = trimmedQuery.length >= MIN_QUERY_LENGTH;
    const centerLat =
        typeof center?.lat === 'number' && Number.isFinite(center.lat)
            ? center.lat
            : undefined;
    const centerLng =
        typeof center?.lng === 'number' && Number.isFinite(center.lng)
            ? center.lng
            : undefined;
    const centerLatKey = centerLat?.toFixed(4) ?? '';
    const centerLngKey = centerLng?.toFixed(4) ?? '';

    return useQuery({
        queryKey: [
            'geocodeSuggestions',
            trimmedQuery,
            centerLatKey,
            centerLngKey,
        ],
        queryFn: async ({ signal }) =>
            fetchSuggestions({
                query: trimmedQuery,
                signal,
                centerLat,
                centerLng,
            }),
        select: parseSuggestions,
        enabled: canSearch,
        refetchOnWindowFocus: false,
        retry: false,
    });
};
