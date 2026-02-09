import { DemoScenario, IntermediateStopInputValue } from './types';

export const DEFAULT_STOP: IntermediateStopInputValue = {
    value: '',
    coordinateKey: null,
    deadlineTimeLocal: '',
    serviceMinutes: '',
};

export const DEMO_SCENARIO: DemoScenario = {
    returnToStart: false,
    origin: {
        label: 'Seattle Center',
        coordinateKey: '-122.350395,47.621067',
    },
    destination: {
        label: 'Seattle-Tacoma International Airport',
        coordinateKey: '-122.308817,47.450249',
    },
    stops: [
        {
            label: 'Pike Place Market',
            coordinateKey: '-122.342089,47.609386',
            deadlineMinutes: '45',
            serviceMinutes: '20',
        },
        {
            label: 'Capitol Hill Clinic',
            coordinateKey: '-122.320849,47.617371',
            deadlineMinutes: '90',
            serviceMinutes: '25',
        },
        {
            label: 'Fremont Service Hub',
            coordinateKey: '-122.349274,47.651444',
            deadlineMinutes: '150',
            serviceMinutes: '15',
        },
    ],
};
