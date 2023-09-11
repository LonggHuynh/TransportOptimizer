import React from 'react';
import './RouteDetails.css';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { showOnGoogleMaps, mapResults } from '../services/mapService';
const RouteDetails = ({ route, setDirectionsResponse }) => {
  const [from, to] = route;

  async function displayRoute(from, to) {
    const resultsForDisplay = await mapResults(from, to);
    setDirectionsResponse(resultsForDisplay);
  }

  return (
    <div className="route-details">
      <span>{from.split(',')[0]}</span>
      <ArrowForwardIcon />
      <span> {to.split(',')[0]}</span>
      <button className="display-route" onClick={() => displayRoute(from, to)}>
        View details
      </button>
      <button
        className="view-on-maps"
        onClick={() => showOnGoogleMaps(from, to)}
      >
        Google Maps
      </button>
    </div>
  );
};

export default RouteDetails;
