
import React from 'react';
import RouteDetails from './RouteDetails';

import './Result.css';
import { useEstimatedTimeStore } from '../hooks/store/useEstimatedTimeStore';
import { useRoutesStore } from '../hooks/store/useRoutesStore';



function Result() {
    const routes = useRoutesStore((state) => state.routes);

    const estimatedTime = useEstimatedTimeStore((state) => state.estimatedTime); 

    return (
        <div className="result">
            <h1>
                Estimated time:{' '}
                {estimatedTime === Infinity
                    ? 0
                    : Math.round(estimatedTime / 60)}{' '}
                minutes{' '}
            </h1>
            {estimatedTime === Infinity ? (
                <p>No route available</p>
            ) : (
                routes.map((route, ind) => (
                    <RouteDetails
                        route={route}
                        key={ind}
                    />
                ))
            )}
        </div>
    );
}

export default Result;
