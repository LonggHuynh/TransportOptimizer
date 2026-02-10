import { Coordinate } from '../models/coordinate';

const COORDINATE_PRECISION = 6;

export const toCoordinateKey = ({ longitude, latitude }: Coordinate): string =>
    `${longitude.toFixed(COORDINATE_PRECISION)},${latitude.toFixed(COORDINATE_PRECISION)}`;

export const parseCoordinateKey = (
    coordinateKey: string,
): Coordinate | null => {
    const parts = coordinateKey.split(',').map((part) => part.trim());
    if (parts.length !== 2) {
        return null;
    }

    const [longitudeRaw, latitudeRaw] = parts;
    const longitude = Number.parseFloat(longitudeRaw);
    const latitude = Number.parseFloat(latitudeRaw);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
        return null;
    }

    return { longitude, latitude };
};
