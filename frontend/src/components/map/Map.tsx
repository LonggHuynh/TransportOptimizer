import React, { useEffect } from 'react';
import {
    MapContainer,
    TileLayer,
    Polyline,
    CircleMarker,
    useMap,
} from 'react-leaflet';
import './Map.scss';
import { useDirectionsStore } from '../../hooks/store/useDirectionsStore';
import { useCenterStore } from '../../hooks/store/useCenterStore';
import { RouteLine } from '../../models/map';

const DEFAULT_ZOOM = 13;
const MARKER_RADIUS = 6;
const FIT_PADDING = 40;

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
            const bounds = route.map(
                (point) => [point.lat, point.lng] as [number, number],
            );
            map.fitBounds(bounds, { padding: [fitPadding, fitPadding] });
            return;
        }

        map.setView([center.lat, center.lng], DEFAULT_ZOOM);
    }, [center, fitPadding, map, route]);

    return null;
};

const Map = () => {
    const center = useCenterStore((state) => state.center);
    const directionsResponse = useDirectionsStore(
        (state) => state.directionsResponse,
    );
    const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
    const tileUrl =
        import.meta.env.VITE_TILE_URL || `${apiBaseUrl}/tiles/{z}/{x}/{y}.png`;

    return (
        <div className="mapContainer">
            <MapContainer
                className="mapLeaflet"
                center={[center.lat, center.lng]}
                zoom={DEFAULT_ZOOM}
                scrollWheelZoom={true}
            >
                <TileLayer url={tileUrl} attribution="Map data" />
                <CircleMarker
                    center={[center.lat, center.lng]}
                    radius={MARKER_RADIUS}
                    pathOptions={{
                        className: 'mapCenterMarker',
                    }}
                />
                {directionsResponse && directionsResponse.length > 1 ? (
                    <Polyline
                        positions={directionsResponse.map((point) => [
                            point.lat,
                            point.lng,
                        ])}
                        pathOptions={{
                            className: 'mapRoute',
                        }}
                    />
                ) : null}
                <MapViewUpdater
                    center={center}
                    route={directionsResponse}
                    fitPadding={FIT_PADDING}
                />
            </MapContainer>
        </div>
    );
};

export default Map;
