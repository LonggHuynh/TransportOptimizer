import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import './Map.scss';
import { useDirectionsStore } from '../../hooks/store/useDirectionsStore';
import { useCenterStore } from '../../hooks/store/useCenterStore';
import { RouteLine } from '../../models/map';

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

const MapViewUpdater = ({
    center,
    route,
    fitPadding,
}: {
    center: { lat: number; lng: number };
    route: RouteLine | null;
    fitPadding: number;
}) => {
    const map = useMap();

    useEffect(() => {
        if (route && route.length > 1) {
            const bounds = route.map((point) => [point.lat, point.lng] as [number, number]);
            map.fitBounds(bounds, { padding: [fitPadding, fitPadding] });
            return;
        }

        map.setView([center.lat, center.lng], DEFAULT_ZOOM);
    }, [center, fitPadding, map, route]);

    return null;
};

const Map = () => {
    const center = useCenterStore((state) => state.center);
    const directionsResponse = useDirectionsStore((state) => state.directionsResponse);
    const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
    const tileUrl = import.meta.env.VITE_TILE_URL || `${apiBaseUrl}/tiles/{z}/{x}/{y}.png`;
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

    return (
        <div className="mapContainer">
            <MapContainer
                className="mapLeaflet"
                center={[center.lat, center.lng]}
                zoom={DEFAULT_ZOOM}
                scrollWheelZoom={true}
            >
                <TileLayer
                    url={tileUrl}
                    attribution="Map data"
                />
                <CircleMarker
                    center={[center.lat, center.lng]}
                    radius={mapTokens.markerRadius}
                    pathOptions={{
                        color: mapTokens.markerStroke,
                        fillColor: mapTokens.markerFill,
                        fillOpacity: 1,
                    }}
                />
                {directionsResponse && directionsResponse.length > 1 ? (
                    <Polyline
                        positions={directionsResponse.map((point) => [point.lat, point.lng])}
                        pathOptions={{
                            color: mapTokens.routeColor,
                            weight: mapTokens.routeWeight,
                            opacity: mapTokens.routeOpacity,
                        }}
                    />
                ) : null}
                <MapViewUpdater
                    center={center}
                    route={directionsResponse}
                    fitPadding={mapTokens.fitPadding}
                />
            </MapContainer>
        </div>
    );
};

export default Map;
