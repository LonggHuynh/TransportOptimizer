import { create } from 'zustand';
import { RouteLine } from '../../models/map';

interface DirectionsState {
    directionsResponse: RouteLine | null;
    setDirectionsResponse: (response: RouteLine | null) => void;
    clearDirections: () => void;
}

export const useDirectionsStore = create<DirectionsState>((set) => ({
    directionsResponse: null,
    setDirectionsResponse: (response: RouteLine | null) =>
        set({ directionsResponse: response }),
    clearDirections: () => set({ directionsResponse: null }),
}));
