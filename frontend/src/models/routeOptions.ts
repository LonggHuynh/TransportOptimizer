import { Coordinate } from './coordinate';

export const TRAVEL_MODES = [
    'driving',
    'walking',
    'bicycling',
    'transit',
] as const;

export type TravelMode = (typeof TRAVEL_MODES)[number];

export interface ComputeRouteInput {
    places: Coordinate[];
    startTimeUtc: string | null;
    travelMode: TravelMode;
}
