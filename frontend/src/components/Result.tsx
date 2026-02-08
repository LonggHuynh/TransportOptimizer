import React from 'react';
import RouteDetails from './RouteDetails';

import './Result.scss';

interface ResultProps {
    routes: [string, string][];
    estimatedTime: number | null;
    status?: string;
    error?: string;
    className?: string;
    showHandle?: boolean;
}

const Result = ({
    routes,
    estimatedTime,
    status,
    error,
    className,
    showHandle = true,
}: ResultProps) => {
    const hasResult = status === 'completed' && estimatedTime !== null;
    const isComputing = status === 'queued' || status === 'processing';
    const minutes = estimatedTime !== null ? Math.round(estimatedTime / 60) : 0;

    return (
        <div className={`result${className ? ` ${className}` : ''}`}>
            {showHandle ? (
                <div className="panel-handle panel-handle--compact">
                    <span className="panel-handle__label">
                        <span className="panel-handle__grip" aria-hidden="true">::</span>
                        Optimization Results
                    </span>
                    <span className="panel-handle__hint">Drag</span>
                </div>
            ) : null}
            <h1>
                Estimated drive time: {minutes} min
            </h1>
            {error && <p>{error}</p>}
            {isComputing && <p>Optimizing stop order...</p>}
            {!isComputing && status === 'completed' && !hasResult && (
                <p>No feasible route found</p>
            )}
            {hasResult && routes.map((route, ind) => (
                <RouteDetails
                    route={route}
                    key={ind}
                />
            ))}
        </div>
    );
};

export default Result;
