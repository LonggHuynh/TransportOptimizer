import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { apiInstance } from '../../api';

export interface GeocodeSuggestion {
    id: string;
    label: string;
    placeId?: string;
}

const MIN_QUERY_LENGTH = 3;
const SUGGESTION_LIMIT = 6;

type GeocodeSuggestionsQueryOptions = Omit<
    UseQueryOptions<
        GeocodeSuggestion[],
        AxiosError,
        GeocodeSuggestion[],
        [string, string]
    >,
    'queryKey' | 'queryFn' | 'enabled'
>;

interface SuggestionRecord extends Record<string, unknown> {
    id?: unknown;
    label?: unknown;
    placeId?: unknown;
    place_id?: unknown;
    description?: unknown;
    text?: unknown;
}

const isRecord = (value: unknown): value is SuggestionRecord =>
    typeof value === 'object' && value !== null;

const parseSuggestion = (
    input: unknown,
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
    const placeId = typeof rawPlaceId === 'string' && rawPlaceId.trim()
        ? rawPlaceId.trim()
        : undefined;
    const id = placeId
        ?? (typeof input.id === 'string' && input.id.trim()
            ? input.id.trim()
            : `${label}-${index}`);

    return {
        id,
        label,
        placeId,
    };
};

const parseSuggestions = (data: unknown): GeocodeSuggestion[] => {
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
}: {
    query: string;
    signal: AbortSignal;
}) => {
    const response = await apiInstance.get<unknown>('geocode/suggest', {
        params: { query, limit: SUGGESTION_LIMIT },
        signal,
    });
    return response.data;
};

export const useGeocodeSuggestions = (
    query: string,
    options: GeocodeSuggestionsQueryOptions = {},
) => {
    const trimmedQuery = query.trim();
    const canSearch = trimmedQuery.length >= MIN_QUERY_LENGTH;

    const suggestionQuery = useQuery<
        GeocodeSuggestion[],
        AxiosError,
        GeocodeSuggestion[],
        [string, string]
    >({
        queryKey: ['geocodeSuggestions', trimmedQuery],
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
