import React, { useRef } from 'react';
import Map from '../components/Map';
import RouteForm from '../components/RouteForm';
import Result from '../components/Result';
import './Main.scss';
import { useCenterStore } from '../hooks/store/useCenterStore';
import { useDirectionsStore } from '../hooks/store/useDirectionsStore';
import Draggable from 'react-draggable';

const Main = () => {
    // Not direct subscription but to force mapping re-render.
    useCenterStore((state) => state.center);
    useDirectionsStore((state) => state.directionsResponse);
    const plannerPanelRef = useRef<HTMLDivElement>(null);

    return (
        <>
            <Map />
            <div className="container">
                <div className="dragLayer">
                    <Draggable
                        nodeRef={plannerPanelRef}
                        handle=".panel-handle"
                        cancel="input,textarea,button,select,option,.MuiSwitch-root,.MuiAutocomplete-root,.MuiAutocomplete-popper,.MuiAutocomplete-option"
                        bounds="parent"
                    >
                        <div
                            ref={plannerPanelRef}
                            className="draggable-panel dragPanel dragPanel--planner"
                        >
                            <RouteForm />
                        </div>
                    </Draggable>
                    <Result />
                </div>
            </div>
        </>
    );
};

export default Main;
