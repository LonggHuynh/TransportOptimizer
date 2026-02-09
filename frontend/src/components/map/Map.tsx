import React, { useEffect, useMemo, useRef } from 'react';
import './Map.scss';
import { useDirectionsStore } from '../../hooks/store/useDirectionsStore';
import { useCenterStore } from '../../hooks/store/useCenterStore';
import { getGoogleMaps, useGoogleMapsApi } from '../../hooks/useGoogleMapsApi';

const DEFAULT_ZOOM = 13;

const readCssToken = (tokenName: string, fallback: string) => {
    if (typeof window === 'undefined') {
        return fallback;
    }

    const value = getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
    return value || fallback;
};

const readCssNumberToken = (tokenName: string, fallback: number) => {
    const value = Number.parseFloat(readCssToken(tokenName, `${fallback}`));
    if (!Number.isFinite(value)) {
        return fallback;
    }
    return value;
};

const Map = () => {
    const center = useCenterStore((state) => state.center);
    const directionsResponse = useDirectionsStore((state) => state.directionsResponse);
    const { isLoaded, error } = useGoogleMapsApi();
    const mapElementRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const centerMarkerRef = useRef<any>(null);
    const routeLineRef = useRef<any>(null);
    const mapTokens = useMemo(
        () => ({
            markerRadius: readCssNumberToken('--map-marker-radius', 6),
            markerStroke: readCssToken('--color-map-marker-stroke', 'var(--color-accent)'),
            markerFill: readCssToken('--color-map-marker-fill', 'var(--color-panel)'),
            routeColor: readCssToken('--color-map-route', 'var(--color-accent)'),
            routeWeight: readCssNumberToken('--map-route-weight', 4),
            routeOpacity: readCssNumberToken('--map-route-opacity', 0.9),
            fitPadding: readCssNumberToken('--map-fit-padding', 40),
        }),
        [],
    );

    useEffect(() => {
        if (!isLoaded || !mapElementRef.current || mapRef.current) {
            return;
        }

        const googleMaps = getGoogleMaps() as any;
        if (!googleMaps) {
            return;
        }

        mapRef.current = new googleMaps.Map(mapElementRef.current, {
            center,
            zoom: DEFAULT_ZOOM,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
        });

        centerMarkerRef.current = new googleMaps.Circle({
            map: mapRef.current,
            center,
            radius: Math.max(1, mapTokens.markerRadius) * 40,
            strokeColor: mapTokens.markerStroke,
            strokeWeight: 2,
            strokeOpacity: 1,
            fillColor: mapTokens.markerFill,
            fillOpacity: 1,
        });
    }, [
        center,
        isLoaded,
        mapTokens.markerFill,
        mapTokens.markerRadius,
        mapTokens.markerStroke,
    ]);

    useEffect(() => {
        if (!isLoaded || !mapRef.current) {
            return;
        }

        const googleMaps = getGoogleMaps() as any;
        if (!googleMaps) {
            return;
        }

        centerMarkerRef.current?.setOptions({
            center,
            radius: Math.max(1, mapTokens.markerRadius) * 40,
            strokeColor: mapTokens.markerStroke,
            fillColor: mapTokens.markerFill,
        });

        if (directionsResponse && directionsResponse.length > 1) {
            if (!routeLineRef.current) {
                routeLineRef.current = new googleMaps.Polyline({
                    map: mapRef.current,
                    geodesic: true,
                });
            }

            routeLineRef.current.setOptions({
                path: directionsResponse,
                strokeColor: mapTokens.routeColor,
                strokeOpacity: mapTokens.routeOpacity,
                strokeWeight: mapTokens.routeWeight,
            });

            const bounds = new googleMaps.LatLngBounds();
            directionsResponse.forEach((point) => bounds.extend(point));
            mapRef.current.fitBounds(bounds, mapTokens.fitPadding);
            return;
        }

        routeLineRef.current?.setMap(null);
        routeLineRef.current = null;
        mapRef.current.setCenter(center);
        mapRef.current.setZoom(DEFAULT_ZOOM);
    }, [
        center,
        directionsResponse,
        isLoaded,
        mapTokens.fitPadding,
        mapTokens.markerFill,
        mapTokens.markerRadius,
        mapTokens.markerStroke,
        mapTokens.routeColor,
        mapTokens.routeOpacity,
        mapTokens.routeWeight,
    ]);

    useEffect(() => () => {
        routeLineRef.current?.setMap(null);
        centerMarkerRef.current?.setMap(null);
        routeLineRef.current = null;
        centerMarkerRef.current = null;
        mapRef.current = null;
    }, []);

    return (
        <div className="mapContainer">
            <div className="mapGoogle" ref={mapElementRef} />
            {error ? <div className="mapError">{error}</div> : null}
        </div>
    );
};

export default Map;
