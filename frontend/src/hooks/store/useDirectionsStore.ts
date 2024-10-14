import { create } from 'zustand';

interface DirectionsState {
    directionsResponse: google.maps.DirectionsResult | null;
    setDirectionsResponse: (response: google.maps.DirectionsResult | null) => void;
    clearDirections: () => void;
}

export const useDirectionsStore = create<DirectionsState>((set) => ({
    directionsResponse: null,
    setDirectionsResponse: (response: google.maps.DirectionsResult | null) => set({ directionsResponse: response }),
    clearDirections: () => set({ directionsResponse: null }),
}));
