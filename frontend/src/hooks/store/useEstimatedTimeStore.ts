import { create } from 'zustand';

interface EstimatedTimeState {
    estimatedTime: number;
    setEstimatedTime: (time: number) => void;
    clearEstimatedTime: () => void;
}

export const useEstimatedTimeStore = create<EstimatedTimeState>((set) => ({
    estimatedTime: 0, 
    setEstimatedTime: (time: number) => set({ estimatedTime: time }), 
    clearEstimatedTime: () => set({ estimatedTime: 0 }), 
}));
