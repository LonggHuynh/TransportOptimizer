import React from 'react';
import Draggable from 'react-draggable';
import RouteDetails from './RouteDetails';
import { useRouteComputationStore } from '../hooks/store/useRouteComputationStore';

import './Result.scss';

type ResultTone = 'idle' | 'working' | 'success' | 'error';

const getStatusMeta = ({
    status,
    error,
    hasResult,
    isComputing,
}: {
    status?: string;
    error?: string;
    hasResult: boolean;
    isComputing: boolean;
}): { label: string; tone: ResultTone } => {
    if (error || status === 'failed') {
        return { label: 'Failed', tone: 'error' };
    }

    if (isComputing) {
        return { label: 'Optimizing', tone: 'working' };
    }

    if (hasResult) {
        return { label: 'Ready', tone: 'success' };
    }

    return { label: 'Waiting', tone: 'idle' };
};

const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds <= 0) {
        return '—';
    }

    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (!hours) {
        return `${minutes} min`;
    }

    return `${hours}h ${remainingMinutes.toString().padStart(2, '0')}m`;
};

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
    const statusMeta = getStatusMeta({ status, error, hasResult, isComputing });
    const routeLegCount = routes.length;
    const duration = formatDuration(estimatedTime);

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
                            <div className="result__route-list">
                                {routes.map((route, index) => (
                                    <RouteDetails
                                        route={route}
                                        index={index + 1}
                                        key={`${route[0]}-${route[1]}-${index}`}
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
