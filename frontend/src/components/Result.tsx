
import React from 'react';
import RouteDetails from './RouteDetails';

import './Result.css';

interface ResultProps {
    routes: [string, string][];
    estimatedTime: number | null;
    status?: string;
    error?: string;
}

function Result({ routes, estimatedTime, status, error }: ResultProps) {
    const hasResult = status === 'completed' && estimatedTime !== null;
    const isComputing = status === 'queued' || status === 'processing';
    const minutes = estimatedTime !== null ? Math.round(estimatedTime / 60) : 0;

    return (
        <div className="result">
            <h1>
                Estimated time: {minutes} minutes
            </h1>
            {error && <p>{error}</p>}
            {isComputing && <p>Computing best route...</p>}
            {!isComputing && status === 'completed' && !hasResult && (
                <p>No route available</p>
            )}
            {hasResult && routes.map((route, ind) => (
                <RouteDetails
                    route={route}
                    key={ind}
                />
            ))}
        </div>
    );
}

export default Result;
