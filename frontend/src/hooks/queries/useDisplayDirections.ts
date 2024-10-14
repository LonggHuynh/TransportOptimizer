import { useMutation } from '@tanstack/react-query';
import { useDirectionsStore } from '../store/useDirectionsStore';
import { toast } from 'react-toastify';
import { AxiosError } from 'axios';


// Function to fetch directions using Google Maps API
const fetchDirections = async (from: string, to: string) => {
    const directionsService = new google.maps.DirectionsService();
    const result = await directionsService.route({
        origin: from,
        destination: to,
        travelMode: google.maps.TravelMode.TRANSIT,
    });
    return result;
};

export const useDisplayDirections = () => {
    const setDirectionsResponse = useDirectionsStore((state) => state.setDirectionsResponse);

    return useMutation(
        {
            mutationFn: async ({ from, to }: { from: string, to: string }) => fetchDirections(from, to),
            onSuccess: (data) => {
                setDirectionsResponse(data);
            },
            onError: (error: AxiosError) => {
                toast(`Failed to fetch directions: ${error}`);
            },
        }
    );
};
