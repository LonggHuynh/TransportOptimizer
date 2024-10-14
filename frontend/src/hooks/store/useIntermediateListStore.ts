import { create } from 'zustand';

interface IntermediateListState {
    intermediateList: string[];
    addToIntermediateList: (place: string) => void;
    removeFromIntermediateList: (place: string) => void;
    resetIntermediateList: () => void;
}

export const useIntermediateListStore = create<IntermediateListState>((set) => ({
    intermediateList: [],
    addToIntermediateList: (place) => set((state) => ({
        intermediateList: state.intermediateList.includes(place)
            ? state.intermediateList
            : [...state.intermediateList, place],
    })),
    removeFromIntermediateList: (place) => set((state) => ({
        intermediateList: state.intermediateList.filter((p) => p !== place),
    })),
    resetIntermediateList: () => set({ intermediateList: [] }),
}));
