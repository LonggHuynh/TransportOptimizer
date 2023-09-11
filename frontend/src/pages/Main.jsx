import { useJsApiLoader } from '@react-google-maps/api';
import { useEffect, useState } from 'react';

import Map from '../components/Map';
import Result from '../components/Result';

import Form from '../components/Form';
import './Main.css';
import Requirements from '../components/Requirements';
const libraries = ['places'];

const Main = () => {
    const [center, setCenter] = useState({ lat: 59.437, lng: 24.7536 });

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
        libraries,
    });

    const [directionsResponse, setDirectionsResponse] = useState(null);
    const [intermediateList, setIntermediateList] = useState([]);
    const [estimatedTime, setEstimatedTime] = useState(0);
    const [routes, setRoutes] = useState([]);
    const [showReq, setShowReq] = useState(false);
    const [requirements, setRequirements] = useState([]);

    useEffect(() => {
        setDirectionsResponse(null);
        setEstimatedTime(0);
        setRoutes([]);
    }, [intermediateList, requirements]);

    if (!isLoaded) {
        return <></>;
    }

    return (
        <>
            <Map center={center} directionsResponse={directionsResponse} />

            <div className="container">
                <div className="console">
                    <Form
                        setCenter={setCenter}
                        setRequirements={setRequirements}
                        setIntermediateList={setIntermediateList}
                        intermediateList={intermediateList}
                        toggleRequirements={() => setShowReq((prev) => !prev)}
                        setEstimatedTime={setEstimatedTime}
                        setRoutes={setRoutes}
                        requirements={requirements}
                    />

                    {showReq && (
                        <Requirements
                            setShowReq={setShowReq}
                            intermediateList={intermediateList}
                            requirements={requirements}
                            setRequirements={setRequirements}
                        />
                    )}
                </div>
                <Result
                    estimatedTime={estimatedTime}
                    routes={routes}
                    setDirectionsResponse={setDirectionsResponse}
                />
            </div>
        </>
    );
};

export default Main;
