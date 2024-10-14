import React from 'react';
import {  useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import Map from '../components/Map';
import Result from '../components/Result';
import RouteForm from '../components/RouteForm';
import './Main.css';
import Requirements from '../components/Requirements';
import { useJsApiLoader } from '@react-google-maps/api';
import { useCenterStore } from '../hooks/store/useCenterStore';
import { useDirectionsStore } from '../hooks/store/useDirectionsStore';

type Library = 'places' | 'geometry' | 'drawing' | 'visualization';
    const libraries: Library[] = ['places', 'geometry'];
const Main = () => {


    const [showReq, setShowReq] = useState(false);
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY ?? '',
        libraries,
    });


    // Not direct subscription but to force mapping re-render.
    useCenterStore((state) => state.center); 
    useDirectionsStore((state) => state.directionsResponse);

    if (!isLoaded) {
        return <></>;
    }
    return (
        <>
            <Map />  
            <div className="container">
                <div className="console">
                    <RouteForm
                        toggleRequirements={() => setShowReq(true)}
                    />

                    {showReq && (
                        <div className="requirements">
                            <div className="closeIcon" onClick={() => setShowReq(false)}>
                                {' '}
                                <CloseIcon />
                            </div>
                            <Requirements />
                        </div>
                    )}
                </div>
                <Result />
            </div>
        </>
    );
};

export default Main;
