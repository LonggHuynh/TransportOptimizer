var baseUrl = 'https://www.google.com/maps/dir/?api=1';

export function showOnGoogleMaps(from, to) {
  const origin = `origin=${encodeURIComponent(from)}`;
  const destination = `destination=${encodeURIComponent(to)}`;
  const travelMode = 'travelmode=transit';
  const url = `${baseUrl}&${origin}&${destination}&${travelMode}`;

  // Open Google Maps in a new tab with the generated URL
  window.open(url, '_blank');
}

export async function mapResults(from, to) {
  // eslint-disable-next-line no-undef
  const directionsService = new google.maps.DirectionsService();
  const results = await directionsService.route({
    origin: from,
    destination: to,
    // eslint-disable-next-line no-undef
    travelMode: google.maps.TravelMode.TRANSIT,
  });

  return results;
}

export const locateAddress = (address) => {
  // eslint-disable-next-line no-undef
  const geoCoder = new google.maps.Geocoder();

  return new Promise((resolve, reject) => {
    geoCoder.geocode({ address }, (results, status) => {
      if (status === 'OK') {
        resolve(results[0].geometry.location);
      } else {
        reject(`Error: ${status}`);
      }
    });
  });
};
