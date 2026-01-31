import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import './Map.css';
import { useDirectionsStore } from '../hooks/store/useDirectionsStore';
import { useCenterStore } from '../hooks/store/useCenterStore';
import { RouteLine } from '../models/map';



const DEFAULT_ZOOM = 13;

const MapViewUpdater = ({ center, route }: { center: { lat: number; lng: number }; route: RouteLine | null }) => {
    const map = useMap();

    useEffect(() => {
        if (route && route.length > 1) {
            const bounds = route.map((point) => [point.lat, point.lng] as [number, number]);
            map.fitBounds(bounds, { padding: [40, 40] });
            return;
        }

        map.setView([center.lat, center.lng], DEFAULT_ZOOM);
    }, [center, map, route]);

    return null;
};

const Map = () => {
    const center = useCenterStore((state) => state.center); 
    const directionsResponse = useDirectionsStore((state) => state.directionsResponse);
    const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
    const tileUrl = import.meta.env.VITE_TILE_URL || `${apiBaseUrl}/tiles/{z}/{x}/{y}.png`;


    return (
        <div className="mapContainer">
            <MapContainer
                center={[center.lat, center.lng]}
                zoom={DEFAULT_ZOOM}
                scrollWheelZoom={true}
                style={{ width: '100%', height: '100%' }}
            >
                <TileLayer
                    url={tileUrl}
                    attribution="&copy; Mapbox &copy; OpenStreetMap"
                />
                <CircleMarker center={[center.lat, center.lng]} radius={6} pathOptions={{ color: '#1d4ed8' }} />
                {directionsResponse && directionsResponse.length > 1 ? (
                    <Polyline
                        positions={directionsResponse.map((point) => [point.lat, point.lng])}
                        pathOptions={{ color: '#2563eb', weight: 4 }}
                    />
                ) : null}
                <MapViewUpdater center={center} route={directionsResponse} />
            </MapContainer>
        </div>
    );
};

export default Map;
