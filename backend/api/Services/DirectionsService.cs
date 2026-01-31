using System.Globalization;
using api.Configuration;
using api.Externals;
using api.Models;

namespace api.Services
{
    public class DirectionsService(IMapboxClient mapboxClient, IGeocodeService geocodeService, AppOptions appOptions)
        : IDirectionsService
    {
        private readonly IMapboxClient _mapboxClient = mapboxClient;
        private readonly IGeocodeService _geocodeService = geocodeService;
        private readonly AppOptions _appOptions = appOptions;

        public async Task<DirectionsResult?> GetDirectionsAsync(string from, string to)
        {
            var origin = await _geocodeService.GetGeocode(from);
            var destination = await _geocodeService.GetGeocode(to);

            if (origin?.Latitude == null || origin.Longitude == null ||
                destination?.Latitude == null || destination.Longitude == null)
            {
                return null;
            }

            var coordinates = string.Join(";",
                $"{origin.Longitude.Value.ToString(CultureInfo.InvariantCulture)},{origin.Latitude.Value.ToString(CultureInfo.InvariantCulture)}",
                $"{destination.Longitude.Value.ToString(CultureInfo.InvariantCulture)},{destination.Latitude.Value.ToString(CultureInfo.InvariantCulture)}");

            var profile = _appOptions.Mapbox?.DirectionsProfile
                          ?? _appOptions.Mapbox?.MatrixProfile
                          ?? "driving";
            var response = await _mapboxClient.GetDirectionsAsync(profile, coordinates);
            var route = response?.Routes?.FirstOrDefault();
            if (route?.Geometry?.Coordinates == null)
            {
                return null;
            }

            var points = route.Geometry.Coordinates
                .Where(coord => coord.Length >= 2)
                .Select(coord => new GeoCode
                {
                    Longitude = coord[0],
                    Latitude = coord[1],
                })
                .ToList();

            return new DirectionsResult
            {
                Coordinates = points,
                DistanceMeters = route.Distance,
                DurationSeconds = route.Duration,
            };
        }
    }
}
