import { create } from 'zustand';

interface LocationSelection {
    coordinateKey: string;
    label: string;
}

interface LocationLabelsState {
    labelsByCoordinate: Record<string, string>;
    rememberLocation: (selection: LocationSelection) => void;
}

export const useLocationLabelsStore = create<LocationLabelsState>((set) => ({
    labelsByCoordinate: {},
    rememberLocation: ({ coordinateKey, label }) =>
        set((state) => ({
            labelsByCoordinate: {
                ...state.labelsByCoordinate,
                [coordinateKey]: label,
            },
        })),
}));
