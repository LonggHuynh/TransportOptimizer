import React from 'react';
import './RouteDetails.scss';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useDisplayDirections } from '../hooks/queries/useDisplayDirections';
import { useLocationLabelsStore } from '../hooks/store/useLocationLabelsStore';
import { parseCoordinateKey } from '../utils/coordinates';

interface RouteDetailsProps {
    route: string[];
}
const RouteDetails = ({ route }: RouteDetailsProps) => {
    const [from, to] = route;
    const fromLabel = useLocationLabelsStore((state) => state.labelsByCoordinate[from]);
    const toLabel = useLocationLabelsStore((state) => state.labelsByCoordinate[to]);

    const displayFrom = fromLabel ?? (parseCoordinateKey(from) ? from : from.split(',')[0]);
    const displayTo = toLabel ?? (parseCoordinateKey(to) ? to : to.split(',')[0]);

    const { mutateAsync: displayRoute } = useDisplayDirections()

    return (
        <div className="route-details">
            <span>{displayFrom}</span>
            <ArrowForwardIcon />
            <span> {displayTo}</span>
            <button
                className="display-route"
                onClick={() => displayRoute({ from, to })}
            >
                Show on map
            </button>
        </div>
    );
};

export default RouteDetails;
