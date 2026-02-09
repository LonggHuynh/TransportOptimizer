import { create } from 'zustand';
import { TravelMode } from '../../models/routeOptions';
import { StopWindow } from '../../models/stopWindow';

interface RouteRequestSnapshot {
    places: string[];
    stopWindows: StopWindow[];
    startTimeUtc: string | null;
    travelMode: TravelMode;
}

interface RouteComputationState {
    status?: string;
    error?: string;
    bestRoutes: [string, string][];
    totalTime: number | null;
    lastRequest: RouteRequestSnapshot | null;
    setComputedRouteResult: (payload: {
        status?: string;
        error?: string;
        bestRoutes: [string, string][];
        totalTime: number | null;
    }) => void;
    setLastRequest: (payload: RouteRequestSnapshot) => void;
    resetComputedRouteResult: () => void;
}

const initialState = {
    status: undefined,
    error: undefined,
    bestRoutes: [] as [string, string][],
    totalTime: null as number | null,
    lastRequest: null as RouteRequestSnapshot | null,
};

export const useRouteComputationStore = create<RouteComputationState>((set) => ({
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
}));
