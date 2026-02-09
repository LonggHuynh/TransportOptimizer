import { TravelMode } from '../../models/routeOptions';

export interface LocationInput {
    value: string;
    coordinateKey: string | null;
}

export interface IntermediateStopInputValue extends LocationInput {
    deadlineTimeLocal: string;
    serviceMinutes: string;
}

export interface RouteFormValues {
    sameDestination: boolean;
    origin: LocationInput;
    destination: LocationInput;
    stops: IntermediateStopInputValue[];
    departTimeLocal: string;
    travelMode: TravelMode;
}

export interface NormalizedIntermediateStop {
    label: string;
    coordinateKey: string | null;
    index: number;
    deadlineMinutes: number | null;
    serviceMinutes: number;
}

export interface DemoLocation {
    label: string;
    coordinateKey: string;
}

export interface DemoStop extends DemoLocation {
    deadlineMinutes: string;
    serviceMinutes: string;
}

export interface DemoScenario {
    returnToStart: boolean;
    origin: DemoLocation;
    destination: DemoLocation;
    stops: DemoStop[];
}
