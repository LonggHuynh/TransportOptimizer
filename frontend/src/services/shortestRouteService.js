import axios from 'axios';

const backendUrl = 'http://localhost:8080';

const callBackendToComputeRoute = async (dist, requirements) => {
    console.log({
        dist: dist,
        requirements: requirements,
    });
    const response = await axios.post(`${backendUrl}/compute-route`, {
        dist: dist,
        requirements: requirements,
    });

    return response.data;
};

export const computePathAndTime = async (places, requirements) => {
    // eslint-disable-next-line no-undef
    let directionsService = new google.maps.DistanceMatrixService();

    const adjMatrix = await new Promise((resolve, reject) => {
        directionsService.getDistanceMatrix(
            {
                destinations: places,
                origins: places,
                travelMode: 'TRANSIT',
            },
            (response, status) => {
                if (status === 'OK') {
                    resolve(
                        response.rows.map((row) =>
                            row.elements.map(
                                (elem) => elem.duration?.value || 1e8,
                            ),
                        ),
                    );
                } else {
                    reject('API errors');
                }
            },
        );
    });

    const result = await callBackendToComputeRoute(adjMatrix, requirements);

    const bestRoutes = [];
    for (let i = 0; i < result.bestOrder.length - 1; i++) {
        bestRoutes.push([
            places[result.bestOrder[i]],
            places[result.bestOrder[i + 1]],
        ]);
    }

    return {
        bestRoutes: bestRoutes,
        totalTime: result.totalTime,
    };
};
