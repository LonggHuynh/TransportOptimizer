import RouteDetails from './RouteDetails';

import './Result.css';
function Result({ estimatedTime, routes, setDirectionsResponse }) {
    return (
        <div className="result">
            <h1>
                Estimated time:{' '}
                {estimatedTime === Infinity
                    ? 0
                    : Math.round(estimatedTime / 60)}{' '}
                minutes{' '}
            </h1>
            {estimatedTime === Infinity ? (
                <p>No route available</p>
            ) : (
                routes.map((route, ind) => (
                    <RouteDetails
                        route={route}
                        key={ind}
                        setDirectionsResponse={setDirectionsResponse}
                    />
                ))
            )}
        </div>
    );
}

export default Result;
