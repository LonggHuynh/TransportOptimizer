import { create } from 'zustand';
import { Coordinate } from '../../models/coordinate';
import { TravelMode } from '../../models/routeOptions';
import { StopWindow } from '../../models/stopWindow';

interface RouteRequestSnapshot {
    places: Coordinate[];
    stopWindows: StopWindow[];
    startTimeUtc: string | null;
    travelMode: TravelMode;
}

interface RouteComputationState {
    status?: string;
    error?: string;
    bestRoutes: [Coordinate, Coordinate][];
    totalTime: number | null;
    lastRequest: RouteRequestSnapshot | null;
    setComputedRouteResult: (payload: {
        status?: string;
        error?: string;
        bestRoutes: [Coordinate, Coordinate][];
        totalTime: number | null;
    }) => void;
    setLastRequest: (payload: RouteRequestSnapshot) => void;
    resetComputedRouteResult: () => void;
}

const initialState = {
    status: undefined,
    error: undefined,
    bestRoutes: [] as [Coordinate, Coordinate][],
    totalTime: null as number | null,
    lastRequest: null as RouteRequestSnapshot | null,
};

export const useRouteComputationStore = create<RouteComputationState>(
    (set) => ({
        ...initialState,
        setComputedRouteResult: (payload) =>
            set({
                status: payload.status,
                error: payload.error,
                bestRoutes: payload.bestRoutes,
                totalTime: payload.totalTime,
            }),
        setLastRequest: (payload) => set({ lastRequest: payload }),
        resetComputedRouteResult: () => set(initialState),
    }),
);
