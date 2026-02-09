import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiInstance } from '../../api';
import { AxiosError } from 'axios';
import { toCoordinateKey } from '../../utils/coordinates';

export interface MapboxSuggestion {
    id: string;
    label: string;
    coordinateKey?: string;
    latitude?: number;
    longitude?: number;
}

const MIN_QUERY_LENGTH = 3;
const SUGGESTION_LIMIT = 6;
const SUGGESTION_DEBOUNCE_MS = 200;

export interface UseMapboxSuggestionsOptions {
    onSuccess?: (suggestions: MapboxSuggestion[], rawData: unknown) => void;
    onError?: (error: AxiosError) => void;
}

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

    const coordinateKey =
        latitude !== null && longitude !== null
            ? toCoordinateKey(longitude, latitude)
            : undefined;

    const id =
        typeof input.id === 'string' && input.id.trim()
            ? input.id
            : coordinateKey ?? `${label}-${index}`;

    return {
        id,
        label,
        coordinateKey,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
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

        const dedupeKey = parsed.coordinateKey ?? parsed.label.toLowerCase();
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
    options: UseMapboxSuggestionsOptions = {},
) => {
    const { onSuccess: onSuccessOption, onError: onErrorOption } = options;
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
    const [error, setError] = useState<string | null>(null);

    const trimmedQuery = query.trim();
    const canSearch = trimmedQuery.length >= MIN_QUERY_LENGTH;

    const onSuccess = useCallback((data: unknown) => {
        const nextSuggestions = parseSuggestions(data);
        setSuggestions(nextSuggestions);
        setError(null);
        onSuccessOption?.(nextSuggestions, data);
    }, [onSuccessOption]);

    const onError = useCallback((err: AxiosError) => {
        if (err.code === 'ERR_CANCELED') {
            return;
        }

        setError('Failed to load suggestions');
        setSuggestions([]);
        onErrorOption?.(err);
    }, [onErrorOption]);

    useEffect(() => {
        if (!canSearch) {
            setDebouncedQuery('');
            setSuggestions([]);
            setError(null);
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setDebouncedQuery(trimmedQuery);
        }, SUGGESTION_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [canSearch, trimmedQuery]);

    const suggestionQuery = useQuery<unknown, AxiosError>({
        queryKey: ['mapboxSuggestions', debouncedQuery],
        queryFn: ({ signal }) => fetchSuggestions({ query: debouncedQuery, signal }),
        enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
        refetchOnWindowFocus: false,
        retry: false,
    });

    useEffect(() => {
        if (!suggestionQuery.isSuccess) {
            return;
        }

        onSuccess(suggestionQuery.data);
    }, [onSuccess, suggestionQuery.data, suggestionQuery.isSuccess]);

    useEffect(() => {
        if (!suggestionQuery.isError) {
            return;
        }

        onError(suggestionQuery.error);
    }, [onError, suggestionQuery.error, suggestionQuery.isError]);

    return {
        suggestions,
        loading: debouncedQuery.length >= MIN_QUERY_LENGTH && suggestionQuery.isFetching,
        error,
    };
};
