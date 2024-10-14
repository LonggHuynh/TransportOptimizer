import React from 'react';
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';
import './Map.css';
import { useDirectionsStore } from '../hooks/store/useDirectionsStore';
import { useCenterStore } from '../hooks/store/useCenterStore';




    
const Map = () => {
    const center = useCenterStore((state) => state.center); 
    const directionsResponse = useDirectionsStore((state) => state.directionsResponse);


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
