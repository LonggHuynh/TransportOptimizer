import React from 'react';
import Map from '../components/map/Map';
import RouteForm from '../components/route-form/RouteForm';
import Result from '../components/result/Result';
import './Main.scss';
import { useCenterStore } from '../hooks/store/useCenterStore';
import { useDirectionsStore } from '../hooks/store/useDirectionsStore';

const Main = () => {
    // Not direct subscription but to force mapping re-render.
    useCenterStore((state) => state.center);
    useDirectionsStore((state) => state.directionsResponse);

    return (
        <>
            <Map />
            <div className="container">
                <div className="dragLayer">
                    <RouteForm />
                    <Result />
                </div>
            </div>
        </>
    );
};

export default Main;
