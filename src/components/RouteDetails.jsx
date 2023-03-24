import React from 'react'
import './RouteDetails.css'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const RouteDetails = ({ route, displayRoute , showOnGoogleMaps}) => {
    const [from, to] = route
    return (
        <div className='route-details'>
            <span>{from.split(',')[0]}</span>
            <ArrowForwardIcon />
            <span> {to.split(',')[0]}</span>
            <button className="display-route" onClick={() => displayRoute(from, to)}>View details</button>
            <button className='view-on-maps' onClick={() => showOnGoogleMaps(from, to)}>Google Maps</button>
        </div>
    )
}

export default RouteDetails