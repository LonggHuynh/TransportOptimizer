import React from 'react';
import './RouteDetails.scss';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useDisplayDirections } from '../hooks/queries/useDisplayDirections';
import { useLocationLabelsStore } from '../hooks/store/useLocationLabelsStore';
import { parseCoordinateKey } from '../utils/coordinates';

interface RouteDetailsProps {
    route: string[];
    index: number;
}
const RouteDetails = ({ route, index }: RouteDetailsProps) => {
    const [from, to] = route;
    const fromLabel = useLocationLabelsStore((state) => state.labelsByCoordinate[from]);
    const toLabel = useLocationLabelsStore((state) => state.labelsByCoordinate[to]);

    const displayFrom = fromLabel ?? (parseCoordinateKey(from) ? from : from.split(',')[0]);
    const displayTo = toLabel ?? (parseCoordinateKey(to) ? to : to.split(',')[0]);

    const { mutate: displayRoute, isPending } = useDisplayDirections();

    return (
        <div className="route-details">
            <span className="route-details__index">{index}</span>
            <div className="route-details__path">
                <span className="route-details__point">{displayFrom}</span>
                <ArrowForwardIcon fontSize="small" />
                <span className="route-details__point">{displayTo}</span>
            </div>
            <button
                type="button"
                className="display-route"
                disabled={isPending}
                onClick={() => displayRoute({ from, to })}
            >
                {isPending ? 'Loading...' : 'Show on map'}
            </button>
        </div>
    );
};

export default RouteDetails;
