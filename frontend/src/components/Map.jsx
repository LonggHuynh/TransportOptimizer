import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import './Map.css';

function Map({ center, directionsResponse }) {
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
}

export default Map;
