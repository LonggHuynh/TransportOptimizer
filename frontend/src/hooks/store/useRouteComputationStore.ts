import { create } from 'zustand';

interface RouteComputationState {
    status?: string;
    error?: string;
    bestRoutes: [string, string][];
    totalTime: number | null;
    setComputedRouteResult: (payload: {
        status?: string;
        error?: string;
        bestRoutes: [string, string][];
        totalTime: number | null;
    }) => void;
    resetComputedRouteResult: () => void;
}

const initialState = {
    status: undefined,
    error: undefined,
    bestRoutes: [] as [string, string][],
    totalTime: null as number | null,
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
    resetComputedRouteResult: () => set(initialState),
}));
