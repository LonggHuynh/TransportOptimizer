import { TravelMode } from '../../models/routeOptions';
import { Coordinate } from '../../models/coordinate';

export interface LocationInput {
    value: string;
    coordinate: Coordinate | null;
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
    coordinate: Coordinate | null;
    index: number;
    deadlineMinutes: number | null;
    serviceMinutes: number;
}
