import { create } from 'zustand';

interface RoutesState {
    routes: any[]; 
    setRoutes: (newRoutes: any[]) => void;
    resetRoutes: () => void;
}

export const useRoutesStore = create<RoutesState>((set) => ({
    routes: [],
    setRoutes: (newRoutes) => set({ routes: newRoutes }),
    resetRoutes: () => set({ routes: [] }),
}));
