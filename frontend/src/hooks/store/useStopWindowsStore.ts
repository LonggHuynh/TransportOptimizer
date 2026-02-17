import { create } from 'zustand';
import { StopWindow } from '../../models/stopWindow';

interface StopWindowsState {
    stopWindows: StopWindow[];
    setStopWindows: (stopWindows: StopWindow[]) => void;
    upsertStopWindow: (stopWindow: StopWindow) => void;
    removeStopWindow: (stopIndex: number) => void;
    resetStopWindows: () => void;
}

export const useStopWindowsStore = create<StopWindowsState>((set) => ({
    stopWindows: [],
    setStopWindows: (stopWindows) =>
        set({
            stopWindows: [...stopWindows].sort(
                (left, right) => left.stopIndex - right.stopIndex,
            ),
        }),

    upsertStopWindow: (stopWindow) =>
        set((state) => {
            const existingIndex = state.stopWindows.findIndex(
                (window) => window.stopIndex === stopWindow.stopIndex,
            );

            if (existingIndex === -1) {
                return {
                    stopWindows: [...state.stopWindows, stopWindow].sort(
                        (left, right) => left.stopIndex - right.stopIndex,
                    ),
                };
            }

            const updated = [...state.stopWindows];
            updated[existingIndex] = stopWindow;
            return { stopWindows: updated };
        }),

    removeStopWindow: (stopIndex) => {
        set((state) => ({
            stopWindows: state.stopWindows.filter(
                (window) => window.stopIndex !== stopIndex,
            ),
        }));
    },

    resetStopWindows: () => set({ stopWindows: [] }),
}));
