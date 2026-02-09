import { StopWindow } from '../../models/stopWindow';
import { IntermediateStopInputValue, NormalizedIntermediateStop } from './types';

export const toLocalDateTimeFromTime = (timeLocal: string): Date | null => {
    if (!timeLocal.trim()) {
        return null;
    }

    const [hoursText, minutesText] = timeLocal.split(':');
    const hours = Number(hoursText);
    const minutes = Number(minutesText);

    const hasValidHours = Number.isInteger(hours) && hours >= 0 && hours <= 23;
    const hasValidMinutes = Number.isInteger(minutes) && minutes >= 0 && minutes <= 59;
    if (!hasValidHours || !hasValidMinutes) {
        return null;
    }

    const localDateTime = new Date();
    localDateTime.setHours(hours, minutes, 0, 0);
    return localDateTime;
};

export const toTimeLocalValue = (date: Date): string => {
    const withNoSeconds = new Date(date);
    withNoSeconds.setSeconds(0, 0);
    const hours = String(withNoSeconds.getHours()).padStart(2, '0');
    const minutes = String(withNoSeconds.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const toStopDeadlineDateTimeOnOrAfterStart = (
    routeStartLocal: Date | null,
    deadlineTimeLocal: string,
): Date | null => {
    if (!routeStartLocal || !deadlineTimeLocal.trim()) {
        return null;
    }

    const [hoursText, minutesText] = deadlineTimeLocal.split(':');
    const hours = Number(hoursText);
    const minutes = Number(minutesText);

    const hasValidHours = Number.isInteger(hours) && hours >= 0 && hours <= 23;
    const hasValidMinutes = Number.isInteger(minutes) && minutes >= 0 && minutes <= 59;
    if (!hasValidHours || !hasValidMinutes) {
        return null;
    }

    const deadlineDateTime = new Date(routeStartLocal);
    deadlineDateTime.setHours(hours, minutes, 0, 0);

    if (deadlineDateTime.getTime() <= routeStartLocal.getTime()) {
        deadlineDateTime.setDate(deadlineDateTime.getDate() + 1);
    }

    return deadlineDateTime;
};

export const toStopDeadlineTimeLocalValue = (
    routeStartLocal: Date | null,
    deadlineMinutesText: string,
): string => {
    if (!routeStartLocal) {
        return '';
    }

    const deadlineMinutes = Number(deadlineMinutesText);
    if (!Number.isFinite(deadlineMinutes) || deadlineMinutes <= 0) {
        return '';
    }

    const deadlineDate = new Date(routeStartLocal.getTime() + Math.floor(deadlineMinutes) * 60_000);
    return toTimeLocalValue(deadlineDate);
};

export const normalizeIntermediateStops = (
    intermediateInputs: IntermediateStopInputValue[],
    routeStartLocal: Date | null,
): NormalizedIntermediateStop[] =>
    intermediateInputs.reduce<NormalizedIntermediateStop[]>((acc, item, index) => {
        const label = item.value.trim();
        if (!label) {
            return acc;
        }

        let parsedDeadline: number | null = null;
        const deadlineDateTime = toStopDeadlineDateTimeOnOrAfterStart(
            routeStartLocal,
            item.deadlineTimeLocal,
        );
        if (deadlineDateTime && routeStartLocal) {
            const diffMinutes = Math.floor(
                (deadlineDateTime.getTime() - routeStartLocal.getTime()) / 60_000,
            );
            if (diffMinutes > 0) {
                parsedDeadline = Math.min(1439, diffMinutes);
            }
        }

        const rawServiceMinutes = Number(item.serviceMinutes);
        const parsedServiceMinutes = Number.isFinite(rawServiceMinutes) && rawServiceMinutes > 0
            ? Math.min(1439, Math.floor(rawServiceMinutes))
            : 0;

        acc.push({
            label,
            coordinateKey: item.coordinateKey,
            index,
            deadlineMinutes: parsedDeadline,
            serviceMinutes: parsedServiceMinutes,
        });
        return acc;
    }, []);

export const toStopWindows = (normalizedStops: NormalizedIntermediateStop[]): StopWindow[] =>
    normalizedStops.flatMap((item, index) => {
        const hasWindow = item.deadlineMinutes !== null;
        const hasService = item.serviceMinutes > 0;
        if (!hasWindow && !hasService) {
            return [];
        }

        return [{
            stopIndex: index + 1,
            windowStartMinutes: 0,
            windowEndMinutes: item.deadlineMinutes ?? 1439,
            serviceMinutes: item.serviceMinutes,
        }];
    });

export const buildPlacesPayload = (
    originCoordinateKey: string | null,
    destinationCoordinateKey: string | null,
    normalizedStops: NormalizedIntermediateStop[],
): {
    places: string[] | null;
    missingStopNumber: number | null;
} => {
    if (!originCoordinateKey || !destinationCoordinateKey) {
        return {
            places: null,
            missingStopNumber: null,
        };
    }

    const intermediatePlaceKeys: string[] = [];
    for (const stop of normalizedStops) {
        if (!stop.coordinateKey) {
            return {
                places: null,
                missingStopNumber: stop.index + 1,
            };
        }

        intermediatePlaceKeys.push(stop.coordinateKey);
    }

    return {
        places: [originCoordinateKey, ...intermediatePlaceKeys, destinationCoordinateKey],
        missingStopNumber: null,
    };
};

export const toUtcIsoFromLocalTime = (timeLocal: string): string | null => {
    const localDateTime = toLocalDateTimeFromTime(timeLocal);
    if (!localDateTime) {
        return null;
    }

    return localDateTime.toISOString();
};
