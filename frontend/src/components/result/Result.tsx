import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import RouteDetails from './RouteDetails';
import { useRouteComputationStore } from '../../hooks/store/useRouteComputationStore';
import { useResultPanelState } from './hooks/useResultPanelState';
import { useRouteRecalculation } from './hooks/useRouteRecalculation';
import { toCoordinateKey } from '../../utils/coordinates';

import './Result.scss';

const Result = () => {
    const routes = useRouteComputationStore((state) => state.bestRoutes);
    const estimatedTime = useRouteComputationStore((state) => state.totalTime);
    const status = useRouteComputationStore((state) => state.status);
    const error = useRouteComputationStore((state) => state.error);
    const routeLegCount = routes.length;
    const {
        shouldShowResultPanel,
        hasResult,
        isComputing,
        statusMeta,
        duration,
    } = useResultPanelState({
        status,
        error,
        estimatedTime,
        routeLegCount,
    });
    const { isRecalculating, handleDoneAndRecalculate } = useRouteRecalculation();
    const resultPanelRef = useRef<HTMLDivElement>(null);

    if (!shouldShowResultPanel) {
        return null;
    }

    return (
        <Draggable
            nodeRef={resultPanelRef}
            handle=".panel-handle"
            cancel="input,textarea,button,select,option,.MuiSwitch-root,.MuiAutocomplete-root,.MuiAutocomplete-popper,.MuiAutocomplete-option"
            bounds="parent"
        >
            <div
                ref={resultPanelRef}
                className="draggable-panel dragPanel dragPanel--result"
            >
                <div className="result">
                    <div className="panel-handle panel-handle--compact">
                        <span className="panel-handle__label">
                            <span className="panel-handle__grip" aria-hidden="true">::</span>
                            Optimization Results
                        </span>
                        <span className="panel-handle__hint">Drag</span>
                    </div>

                    <header className="result__header">
                        <p className="result__eyebrow">Dispatch Planner</p>
                        <h1 className="result__title">Optimization Results</h1>
                        <span
                            className={`result__status result__status--${statusMeta.tone}`}
                        >
                            {statusMeta.label}
                        </span>
                    </header>

                    <section className="result__metric" aria-live="polite">
                        <p className="result__metric-label">Estimated Drive Time</p>
                        <p className="result__metric-value">{duration}</p>
                        <p className="result__metric-note">
                            {routeLegCount > 0
                                ? `${routeLegCount} route leg${routeLegCount === 1 ? '' : 's'} available`
                                : 'No route legs available yet'}
                        </p>
                    </section>

                    {error && <p className="result__message result__message--error">{error}</p>}
                    {isComputing && (
                        <p className="result__message result__message--loading">
                            Optimizing stop order...
                        </p>
                    )}
                    {!isComputing && status === 'completed' && !hasResult && (
                        <p className="result__message">No feasible route found.</p>
                    )}

                    {hasResult && (
                        <section className="result__routes">
                            <div className="result__routes-head">
                                <h2>Route Breakdown</h2>
                                <span>{routeLegCount}</span>
                            </div>
                            {routeLegCount > 1 && (
                                <p className="result__routes-hint">
                                    Use <strong>Done &amp; recalc</strong> on the current leg when a stop is completed.
                                </p>
                            )}
                            <div className="result__route-list">
                                {routes.map((route, index) => (
                                    <RouteDetails
                                        route={route}
                                        index={index + 1}
                                        canMarkDone={index === 0 && routeLegCount > 1}
                                        onMarkDone={() => handleDoneAndRecalculate(index)}
                                        isRecalculating={isRecalculating}
                                        key={`${toCoordinateKey(route[0])}-${toCoordinateKey(route[1])}-${index}`}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </Draggable>
    );
};

export default Result;
