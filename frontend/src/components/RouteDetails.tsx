import React from 'react';
import './RouteDetails.css';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useDisplayDirections } from '../hooks/queries/useDisplayDirections';

interface RouteDetailsProps {
    route: string[];
}
const RouteDetails = ({ route }: RouteDetailsProps) => {
    const [from, to] = route;


    const { mutateAsync: displayRoute } = useDisplayDirections()

    return (
        <div className="route-details">
            <span>{from.split(',')[0]}</span>
            <ArrowForwardIcon />
            <span> {to.split(',')[0]}</span>
            <button
                className="display-route"
                onClick={() => displayRoute({ from, to })}
            >
                View details
            </button>
        </div>
    );
};

export default RouteDetails;
