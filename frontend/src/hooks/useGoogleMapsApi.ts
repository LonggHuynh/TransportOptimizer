import { useEffect, useState } from 'react';

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-javascript-api';
const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api/js';
const DEFAULT_LIBRARIES = ['places'];

let googleMapsLoadPromise: Promise<void> | null = null;

type GoogleWindow = Window & {
    google?: {
        maps?: unknown;
    };
};

export const getGoogleMaps = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    const googleWindow = window as GoogleWindow;
    return googleWindow.google?.maps ?? null;
};

const loadGoogleMapsScript = (apiKey: string) => {
    if (getGoogleMaps()) {
        return Promise.resolve();
    }

    if (googleMapsLoadPromise) {
        return googleMapsLoadPromise;
    }

    googleMapsLoadPromise = new Promise<void>((resolve, reject) => {
        const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(), {
                once: true,
            });
            existingScript.addEventListener('error', () => {
                reject(new Error('Failed to load Google Maps script.'));
            }, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.id = GOOGLE_MAPS_SCRIPT_ID;
        script.async = true;
        script.defer = true;
        script.src = `${GOOGLE_MAPS_BASE_URL}?key=${encodeURIComponent(apiKey)}&libraries=${DEFAULT_LIBRARIES.join(',')}&loading=async`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps script.'));
        document.head.appendChild(script);
    });

    return googleMapsLoadPromise;
};

export const useGoogleMapsApi = () => {
    const [isLoaded, setIsLoaded] = useState<boolean>(Boolean(getGoogleMaps()));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoaded) {
            return;
        }

        const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
        if (!apiKey) {
            setError('Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY.');
            return;
        }

        let isUnmounted = false;
        loadGoogleMapsScript(apiKey)
            .then(() => {
                if (isUnmounted) {
                    return;
                }
                setIsLoaded(true);
                setError(null);
            })
            .catch((loadError: Error) => {
                if (isUnmounted) {
                    return;
                }
                setError(loadError.message);
            });

        return () => {
            isUnmounted = true;
        };
    }, [isLoaded]);

    return {
        isLoaded,
        error,
    };
};
