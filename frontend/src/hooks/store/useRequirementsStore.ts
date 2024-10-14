import { create } from 'zustand';

interface Requirement {
    from: number;
    to: number;
}

interface RequirementsState {
    requirements: Requirement[];
    addRequirement: (requirement: Requirement) => void;
    removeRequirement: (requirement: Requirement) => void;
    resetRequirements: () => void;
}

export const useRequirementsStore = create<RequirementsState>((set) => ({
    requirements: [],

    addRequirement: (requirement) =>
        set((state) => {
            const alreadyExists = state.requirements.some(
                (r) => r.from === requirement.from && r.to === requirement.to
            );
            if (!alreadyExists) {
                return { requirements: [...state.requirements, requirement] };
            }
            return state; 
        }),

    removeRequirement: (requirement) =>{
        set((state) => ({
            requirements: state.requirements.filter(
                (r) => r.from !== requirement.from || r.to !== requirement.to
            ),
        }))},

    resetRequirements: () => set({ requirements: [] }),
}));
