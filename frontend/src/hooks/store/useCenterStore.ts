import { create } from 'zustand';

interface CenterState {
    center: google.maps.LatLngLiteral;
    setCenter: (newCenter: google.maps.LatLngLiteral) => void;
    resetCenter: () => void;
}

const initialCenter: google.maps.LatLngLiteral = { lat: 59.437, lng: 24.7536 }; 

export const useCenterStore = create<CenterState>((set) => ({
    center: initialCenter, 
    setCenter: (newCenter) => set({ center: newCenter }), 
    resetCenter: () => set({ center: initialCenter }), 
}));
