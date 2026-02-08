import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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

interface SuggestionVariables {
    query: string;
    signal: AbortSignal;
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

const fetchSuggestions = async ({ query, signal }: SuggestionVariables) => {
    const response = await apiInstance.get<unknown>('geocode/suggest', {
        params: { query, limit: SUGGESTION_LIMIT },
        signal,
    });
    return response.data;
};

export const useMapboxSuggestions = (query: string) => {
    const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const debounceRef = useRef<number | null>(null);
    const requestIdRef = useRef(0);

    const { mutateAsync, isPending, reset } = useMutation({
        mutationFn: (variables: SuggestionVariables) => fetchSuggestions(variables),
    });

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < MIN_QUERY_LENGTH) {
            abortRef.current?.abort();
            abortRef.current = null;
            if (debounceRef.current !== null) {
                window.clearTimeout(debounceRef.current);
                debounceRef.current = null;
            }
            reset();
            setSuggestions([]);
            setError(null);
            return;
        }

        if (debounceRef.current !== null) {
            window.clearTimeout(debounceRef.current);
        }

        const controller = new AbortController();
        abortRef.current?.abort();
        abortRef.current = controller;

        const currentRequestId = ++requestIdRef.current;
        debounceRef.current = window.setTimeout(() => {
            debounceRef.current = null;
            mutateAsync({ query: trimmed, signal: controller.signal })
                .then((data) => {
                    if (requestIdRef.current !== currentRequestId) {
                        return;
                    }
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
                    const next = Array.from(dedupe.values());
                    setSuggestions(next);
                    setError(null);
                })
                .catch((err: AxiosError) => {
                    if (requestIdRef.current !== currentRequestId) {
                        return;
                    }
                    if (err.code === 'ERR_CANCELED') {
                        return;
                    }
                    setError('Failed to load suggestions');
                    setSuggestions([]);
                });
        }, SUGGESTION_DEBOUNCE_MS);

        return () => {
            if (debounceRef.current !== null) {
                window.clearTimeout(debounceRef.current);
                debounceRef.current = null;
            }
            controller.abort();
        };
    }, [query, mutateAsync, reset]);

    return { suggestions, loading: isPending, error };
};
