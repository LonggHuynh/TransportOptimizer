import React, { useRef } from 'react';
import Map from '../components/Map';
import RouteForm from '../components/RouteForm';
import Result from '../components/Result';
import './Main.scss';
import { useCenterStore } from '../hooks/store/useCenterStore';
import { useDirectionsStore } from '../hooks/store/useDirectionsStore';
import { useComputePathAndTime } from '../hooks/queries/useComputePathAndTime';
import { toast } from 'react-toastify';
import Draggable from 'react-draggable';

const Main = () => {

    const { enqueueMutation, computedResult } = useComputePathAndTime();
    // Not direct subscription but to force mapping re-render.
    useCenterStore((state) => state.center); 
    useDirectionsStore((state) => state.directionsResponse);
    const routePanelRef = useRef<HTMLDivElement>(null);
    const resultPanelRef = useRef<HTMLDivElement>(null);
    const resultStatus = computedResult.status ?? (enqueueMutation.isPending ? 'queued' : undefined);
    const shouldShowResultPanel = Boolean(resultStatus || computedResult.error);

    const handleCompute = (places: string[]) => {
        toast('Optimizing technician route');
        enqueueMutation.mutate({ places });
    };
    return (
        <>
            <Map />  
            <div className="container">
                <div className="dragLayer">
                    <Draggable
                        nodeRef={routePanelRef}
                        handle=".panel-handle"
                        cancel="input,textarea,button,select,option,.MuiSwitch-root,.MuiAutocomplete-root,.MuiAutocomplete-popper,.MuiAutocomplete-option"
                        bounds="parent"
                    >
                        <div ref={routePanelRef} className="draggable-panel dragPanel dragPanel--planner">
                            <RouteForm onCompute={handleCompute} />
                        </div>
                    </Draggable>
                    {shouldShowResultPanel ? (
                        <Draggable
                            nodeRef={resultPanelRef}
                            handle=".panel-handle"
                            cancel="input,textarea,button,select,option,.MuiSwitch-root,.MuiAutocomplete-root,.MuiAutocomplete-popper,.MuiAutocomplete-option"
                            bounds="parent"
                        >
                            <div ref={resultPanelRef} className="draggable-panel dragPanel dragPanel--result">
                                <Result
                                    routes={computedResult.bestRoutes}
                                    estimatedTime={computedResult.totalTime}
                                    status={resultStatus}
                                    error={computedResult.error}
                                />
                            </div>
                        </Draggable>
                    ) : null}
                </div>
            </div>
        </>
    );
};

export default Main;
