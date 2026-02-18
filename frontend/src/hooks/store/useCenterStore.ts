import { create } from 'zustand';
import { LatLng } from '../../models/map';

interface CenterState {
    center: LatLng;
    setCenter: (newCenter: LatLng) => void;
    resetCenter: () => void;
}

const initialCenter: LatLng = { lat: 59.437, lng: 24.7536 };

export const useCenterStore = create<CenterState>((set) => ({
    center: initialCenter,
    setCenter: (newCenter) => set({ center: newCenter }),
    resetCenter: () => set({ center: initialCenter }),
}));
