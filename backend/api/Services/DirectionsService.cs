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
            var origin = TryParseCoordinate(from, out var parsedOrigin)
                ? parsedOrigin
                : await _geocodeService.GetGeocode(from);
            var destination = TryParseCoordinate(to, out var parsedDestination)
                ? parsedDestination
                : await _geocodeService.GetGeocode(to);

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

        private static bool TryParseCoordinate(string value, out GeoCode coordinate)
        {
            coordinate = new GeoCode();
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            var parts = value.Split(',', StringSplitOptions.TrimEntries);
            if (parts.Length != 2)
            {
                return false;
            }

            if (!double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var longitude)
                || !double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var latitude))
            {
                return false;
            }

            coordinate = new GeoCode
            {
                Longitude = longitude,
                Latitude = latitude,
            };
            return true;
        }
    }
}
