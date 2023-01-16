import React from 'react'
import './RouteDetails.css'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const RouteDetails = ({ route, displayRoute }) => {
    const [from, to] = route
    return (
        <div className='route-details'>
            <span>{from.split(',')[0]}</span>
            <ArrowForwardIcon />
            <span> {to.split(',')[0]}</span>
            <button onClick={() => displayRoute(from, to)}>View details</button>
        </div>
    )
}

export default RouteDetails