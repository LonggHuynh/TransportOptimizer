import { Coordinate } from '../../models/coordinate';
import { TRAVEL_MODES, TravelMode } from '../../models/routeOptions';

interface DemoLocation {
    label: string;
    coordinate: Coordinate;
}

interface DemoStop extends DemoLocation {
    deadlineTimeLocal?: string;
    serviceMinutes?: number;
}

export interface DemoScenarioData {
    name: string;
    description?: string;
    sameDestination: boolean;
    origin: DemoLocation;
    destination: DemoLocation;
    departTimeLocal: string;
    travelMode: TravelMode;
    stops: DemoStop[];
}

export interface DemoScenarioOption {
    fileName: string;
    label: string;
}

export const DEMO_SCENARIOS: DemoScenarioOption[] = [
    {
        fileName: 'helsinki-last-mile-delivery',
        label: 'Helsinki Last-Mile',
    },
    {
        fileName: 'helsinki-tampere-multi-stop',
        label: 'Helsinki-Tampere Intercity',
    },
];

const TIME_LOCAL_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const isCoordinate = (value: unknown): value is Coordinate =>
    isRecord(value) &&
    typeof value.latitude === 'number' &&
    typeof value.longitude === 'number';

const isLocation = (value: unknown): value is DemoLocation =>
    isRecord(value) &&
    typeof value.label === 'string' &&
    value.label.trim().length > 0 &&
    isCoordinate(value.coordinate);

const isTravelMode = (value: unknown): value is TravelMode =>
    typeof value === 'string' && TRAVEL_MODES.some((mode) => mode === value);

const isRequiredTimeLocal = (value: unknown): value is string =>
    typeof value === 'string' && TIME_LOCAL_PATTERN.test(value);

const isDeadlineTimeLocal = (value: unknown): value is string =>
    typeof value === 'string' &&
    (value.length === 0 || TIME_LOCAL_PATTERN.test(value));

const isDemoStop = (value: unknown): value is DemoStop => {
    if (!isLocation(value)) {
        return false;
    }

    if (!('deadlineTimeLocal' in value) && !('serviceMinutes' in value)) {
        return true;
    }

    const deadlineIsValid =
        !('deadlineTimeLocal' in value) ||
        isDeadlineTimeLocal(value.deadlineTimeLocal);
    const serviceIsValid =
        !('serviceMinutes' in value) ||
        (typeof value.serviceMinutes === 'number' &&
            Number.isFinite(value.serviceMinutes) &&
            value.serviceMinutes >= 0);

    return deadlineIsValid && serviceIsValid;
};

export const parseDemoScenario = (raw: unknown): DemoScenarioData | null => {
    if (!isRecord(raw)) {
        return null;
    }

    const {
        name,
        description,
        sameDestination,
        origin,
        destination,
        departTimeLocal,
        travelMode,
        stops,
    } = raw;

    if (typeof name !== 'string' || name.trim().length === 0) {
        return null;
    }
    if (description !== undefined && typeof description !== 'string') {
        return null;
    }
    if (typeof sameDestination !== 'boolean') {
        return null;
    }
    if (!isLocation(origin) || !isLocation(destination)) {
        return null;
    }
    if (!isRequiredTimeLocal(departTimeLocal)) {
        return null;
    }
    if (!isTravelMode(travelMode)) {
        return null;
    }
    if (!Array.isArray(stops) || !stops.every(isDemoStop)) {
        return null;
    }

    return {
        name,
        description,
        sameDestination,
        origin,
        destination,
        departTimeLocal,
        travelMode,
        stops,
    };
};
