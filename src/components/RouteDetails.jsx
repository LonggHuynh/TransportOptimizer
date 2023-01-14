import React from 'react'
import './RouteDetails.css'

const RouteDetails = ({ route, displayRoute }) => {
    const [from, to] = route
    return (
        <div className='route-details'>
            <span>{from.split(',')[0]} ---- {to.split(',')[0]}</span>
            <button onClick={() => displayRoute(from, to)}>View details</button>
        </div>
    )
}

export default RouteDetails