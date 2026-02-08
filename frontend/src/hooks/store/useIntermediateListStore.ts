import { create } from 'zustand';

interface IntermediateListState {
    intermediateList: string[];
    setIntermediateList: (places: string[]) => void;
}

export const useIntermediateListStore = create<IntermediateListState>((set) => ({
    intermediateList: [],
    setIntermediateList: (places) => set({ intermediateList: places }),
}));
