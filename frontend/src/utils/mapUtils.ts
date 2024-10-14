var baseUrl = process.env.REACT_APP_GOOGLE_MAPS_DISPLAY_URL;

export function showOnGoogleMaps(from: string, to: string) {
    const origin = `origin=${encodeURIComponent(from)}`;
    const destination = `destination=${encodeURIComponent(to)}`;
    const travelMode = 'travelmode=transit';
    const url = `${baseUrl}&${origin}&${destination}&${travelMode}`;

    window.open(url, '_blank');
}



