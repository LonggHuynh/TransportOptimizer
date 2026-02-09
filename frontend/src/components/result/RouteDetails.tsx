import React from 'react';
import './RouteDetails.scss';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useDisplayDirections } from '../../hooks/queries/useDisplayDirections';
import { useLocationLabelsStore } from '../../hooks/store/useLocationLabelsStore';
import { parseCoordinateKey } from '../../utils/coordinates';

interface RouteDetailsProps {
    route: string[];
    index: number;
    canMarkDone: boolean;
    onMarkDone: () => void;
    isRecalculating: boolean;
}
const RouteDetails = ({
    route,
    index,
    canMarkDone,
    onMarkDone,
    isRecalculating,
}: RouteDetailsProps) => {
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
            <div className="route-details__actions">
                <button
                    type="button"
                    className="display-route"
                    disabled={isPending || isRecalculating}
                    onClick={() => displayRoute({ from, to })}
                >
                    {isPending ? 'Loading...' : 'Show on map'}
                </button>
                {canMarkDone && (
                    <button
                        type="button"
                        className="mark-done"
                        disabled={isPending || isRecalculating}
                        onClick={onMarkDone}
                    >
                        {isRecalculating ? 'Recalculating...' : 'Done & recalc'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default RouteDetails;
