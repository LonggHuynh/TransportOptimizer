import React from 'react';
import { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import Map from '../components/Map';
import Result from '../components/Result';
import RouteForm from '../components/RouteForm';
import './Main.css';
import Requirements from '../components/Requirements';
import { useCenterStore } from '../hooks/store/useCenterStore';
import { useDirectionsStore } from '../hooks/store/useDirectionsStore';
import { useComputePathAndTime } from '../hooks/queries/useComputePathAndTime';
import { toast } from 'react-toastify';

const Main = () => {


    const [showReq, setShowReq] = useState(false);
    const { enqueueMutation, computedResult } = useComputePathAndTime();
    // Not direct subscription but to force mapping re-render.
    useCenterStore((state) => state.center); 
    useDirectionsStore((state) => state.directionsResponse);

    const handleCompute = (places: string[]) => {
        toast('Computing best route');
        enqueueMutation.mutate({ places });
    };
    return (
        <>
            <Map />  
            <div className="container">
                <div className="console">
                    <RouteForm
                        toggleRequirements={() => setShowReq(true)}
                        onCompute={handleCompute}
                    />

                    {showReq && (
                        <div className="requirements">
                            <div className="closeIcon" onClick={() => setShowReq(false)}>
                                {' '}
                                <CloseIcon />
                            </div>
                            <Requirements />
                        </div>
                    )}
                </div>
                <Result
                    routes={computedResult.bestRoutes}
                    estimatedTime={computedResult.totalTime}
                    status={computedResult.status}
                    error={computedResult.error}
                />
            </div>
        </>
    );
};

export default Main;
