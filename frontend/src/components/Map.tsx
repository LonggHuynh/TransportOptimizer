import React from 'react';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import './Map.css';

// Define the prop types
interface MapProps {
    center: google.maps.LatLngLiteral; // Type for center coordinates
    directionsResponse?: google.maps.DirectionsResult | null; // Directions response, optional
}

const Map: React.FC<MapProps> = ({ center, directionsResponse }) => {
    return (
        <div className="mapContainer">
            <GoogleMap
                center={center}
                zoom={15}
                mapContainerStyle={{ width: '100%', height: '100%' }}
                options={{
                    zoomControl: true,
                    streetViewControl: true,
                    mapTypeControl: true,
                    fullscreenControl: true,
                }}
            >
                <Marker position={center} />
                {directionsResponse && (
                    <DirectionsRenderer directions={directionsResponse} />
                )}
            </GoogleMap>
        </div>
    );
};

export default Map;
