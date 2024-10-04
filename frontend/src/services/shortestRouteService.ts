import axios from 'axios';
import { apiInstance } from '../api';

// Define the expected structure of the response from the backend
interface ComputeRouteResponse {
    order: number[];
    totalTime: number;
}

// Function to call the backend API with typed parameters and return type
const callBackendToComputeRoute = async (
    dist: number[][],
    requirements: number[][],
): Promise<ComputeRouteResponse> => {
    const response = await apiInstance.post<ComputeRouteResponse>(
        'ComputeRoute/compute-route',
        {
            dist: dist,
            requirements: requirements,
        },
    );

    return response.data;
};

// Define the return type of computePathAndTime
interface ComputePathAndTimeResult {
    bestRoutes: [string, string][];
    totalTime: number;
}

export const computePathAndTime = async (
    places: string[],
    requirements: number[][],
): Promise<ComputePathAndTimeResult> => {
    // Initialize the DistanceMatrixService
    const directionsService = new google.maps.DistanceMatrixService();

    console.log(places);
    console.log(requirements);
    // Create a Promise that resolves to a 2D array of numbers
    const adjMatrix: number[][] = await new Promise<number[][]>(
        (resolve, reject) => {
            directionsService.getDistanceMatrix(
                {
                    destinations: places,
                    origins: places,
                    travelMode: google.maps.TravelMode.TRANSIT,
                },
                (
                    response: google.maps.DistanceMatrixResponse | null,
                    status: google.maps.DistanceMatrixStatus,
                ) => {
                    if (
                        response &&
                        status === google.maps.DistanceMatrixStatus.OK
                    ) {
                        resolve(
                            response.rows.map((row) =>
                                row.elements.map(
                                    (elem) => elem.duration?.value || 1e8,
                                ),
                            ),
                        );
                    } else {
                        reject(new Error('API errors'));
                    }
                },
            );
        },
    );

    // Call the backend function with typed parameters
    const result = await callBackendToComputeRoute(adjMatrix, requirements);

    // Build the bestRoutes array with proper typing
    const bestRoutes: [string, string][] = [];
    for (let i = 0; i < result.order.length - 1; i++) {
        bestRoutes.push([places[result.order[i]], places[result.order[i + 1]]]);
    }

    // Return the result with proper typing
    return {
        bestRoutes: bestRoutes,
        totalTime: result.totalTime,
    };
};
