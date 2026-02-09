export const TRAVEL_MODES = ['driving', 'walking', 'bicycling', 'transit'] as const;

export type TravelMode = (typeof TRAVEL_MODES)[number];

export interface ComputeRouteInput {
    places: string[];
    startTimeUtc: string | null;
    travelMode: TravelMode;
}
