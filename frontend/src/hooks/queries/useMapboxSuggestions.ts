import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiInstance } from '../../api';
import { AxiosError } from 'axios';
import { Coordinate } from '../../models/coordinate';
import { toCoordinateKey } from '../../utils/coordinates';

export interface MapboxSuggestion {
    id: string;
    label: string;
    coordinate?: Coordinate;
}

const MIN_QUERY_LENGTH = 3;
const SUGGESTION_LIMIT = 6;

type MapboxSuggestionsQueryOptions = Omit<
    UseQueryOptions<MapboxSuggestion[], AxiosError, MapboxSuggestion[], [string, string]>,
    'queryKey' | 'queryFn' | 'enabled'
>;

interface SuggestionRecord extends Record<string, unknown> {
    id?: unknown;
    label?: unknown;
    placeName?: unknown;
    place_name?: unknown;
    text?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    center?: unknown;
}

const isRecord = (value: unknown): value is SuggestionRecord =>
    typeof value === 'object' && value !== null;

const getFiniteNumber = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

const parseSuggestion = (input: unknown, index: number): MapboxSuggestion | null => {
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

    const rawLabel = input.label ?? input.placeName ?? input.place_name ?? input.text;
    if (typeof rawLabel !== 'string') {
        return null;
    }

    const label = rawLabel.trim();
    if (!label) {
        return null;
    }

    let latitude = getFiniteNumber(input.latitude);
    let longitude = getFiniteNumber(input.longitude);
    if ((latitude === null || longitude === null) && Array.isArray(input.center) && input.center.length >= 2) {
        longitude = getFiniteNumber(input.center[0]);
        latitude = getFiniteNumber(input.center[1]);
    }

    const coordinate = latitude !== null && longitude !== null
        ? { longitude, latitude }
        : undefined;

    const id =
        typeof input.id === 'string' && input.id.trim()
            ? input.id
            : (coordinate ? toCoordinateKey(coordinate) : `${label}-${index}`);

    return {
        id,
        label,
        coordinate,
    };
};

const parseSuggestions = (data: unknown): MapboxSuggestion[] => {
    const payload = Array.isArray(data) ? data : [];
    const dedupe = new Map<string, MapboxSuggestion>();

    payload.forEach((item, index) => {
        const parsed = parseSuggestion(item, index);
        if (!parsed) {
            return;
        }

        const dedupeKey = parsed.coordinate
            ? toCoordinateKey(parsed.coordinate)
            : parsed.label.toLowerCase();
        if (!dedupe.has(dedupeKey)) {
            dedupe.set(dedupeKey, parsed);
        }
    });

    return Array.from(dedupe.values());
};

const fetchSuggestions = async ({ query, signal }: { query: string; signal: AbortSignal }) => {
    const response = await apiInstance.get<unknown>('geocode/suggest', {
        params: { query, limit: SUGGESTION_LIMIT },
        signal,
    });
    return response.data;
};

export const useMapboxSuggestions = (
    query: string,
    options: MapboxSuggestionsQueryOptions = {},
) => {
    const trimmedQuery = query.trim();
    const canSearch = trimmedQuery.length >= MIN_QUERY_LENGTH;

    const suggestionQuery = useQuery<
        MapboxSuggestion[],
        AxiosError,
        MapboxSuggestion[],
        [string, string]
    >({
        queryKey: ['mapboxSuggestions', trimmedQuery],
        queryFn: async ({ signal }) =>
            parseSuggestions(await fetchSuggestions({ query: trimmedQuery, signal })),
        enabled: canSearch,
        refetchOnWindowFocus: false,
        retry: false,
        ...options,
    });

    return {
        suggestions: suggestionQuery.data ?? [],
        loading: canSearch && suggestionQuery.isFetching,
        error:
            suggestionQuery.isError && suggestionQuery.error.code !== 'ERR_CANCELED'
                ? 'Failed to load suggestions'
                : null,
    };
};
