import React from 'react';
import Draggable from 'react-draggable';
import RouteDetails from './RouteDetails';
import { useRouteComputationStore } from '../hooks/store/useRouteComputationStore';

import './Result.scss';

const Result = () => {
    const routes = useRouteComputationStore((state) => state.bestRoutes);
    const estimatedTime = useRouteComputationStore((state) => state.totalTime);
    const status = useRouteComputationStore((state) => state.status);
    const error = useRouteComputationStore((state) => state.error);

    const shouldShowResultPanel = Boolean(status || error);
    if (!shouldShowResultPanel) {
        return null;
    }

    const hasResult = status === 'completed' && estimatedTime !== null;
    const isComputing = status === 'queued' || status === 'processing';
    const minutes = estimatedTime !== null ? Math.round(estimatedTime / 60) : 0;

    return (
        <Draggable
            handle=".panel-handle"
            cancel="input,textarea,button,select,option,.MuiSwitch-root,.MuiAutocomplete-root,.MuiAutocomplete-popper,.MuiAutocomplete-option"
            bounds="parent"
        >
            <div className="draggable-panel dragPanel dragPanel--result">
                <div className="result">
                    <div className="panel-handle panel-handle--compact">
                        <span className="panel-handle__label">
                            <span className="panel-handle__grip" aria-hidden="true">::</span>
                            Optimization Results
                        </span>
                        <span className="panel-handle__hint">Drag</span>
                    </div>
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
            </div>
        </Draggable>
    );
};

export default Result;
