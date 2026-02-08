using System.Globalization;
using api.Configuration;
using api.Externals;
using api.Models;

namespace api.Services
{
    public class DistanceService(IMapboxClient mapboxClient, IGeocodeService geocodeService, AppOptions appOptions)
        : IDistanceService
    {
        private readonly IMapboxClient _mapboxClient = mapboxClient;
        private readonly IGeocodeService _geocodeService = geocodeService;
        private readonly AppOptions _appOptions = appOptions;

        public async Task<int[][]> GetDistanceMatrixAsync(string[] places)
        {
            if (places.Length == 0)
            {
                return [];
            }

            var geocodeTasks = new Dictionary<string, Task<GeoCode?>>();
            foreach (var place in places)
            {
                if (TryParseCoordinate(place, out _))
                {
                    continue;
                }

                var normalized = NormalizeAddress(place);
                if (!geocodeTasks.ContainsKey(normalized))
                {
                    geocodeTasks[normalized] = _geocodeService.GetGeocode(place);
                }
            }

            await Task.WhenAll(geocodeTasks.Values);

            var coordinates = new List<GeoCode>();
            foreach (var place in places)
            {
                if (TryParseCoordinate(place, out var parsedCoordinate))
                {
                    coordinates.Add(parsedCoordinate);
                    continue;
                }

                var normalized = NormalizeAddress(place);
                var geocode = await geocodeTasks[normalized];
                if (geocode?.Latitude == null || geocode.Longitude == null)
                {
                    throw new Exception($"Failed to geocode address: {place}");
                }

                coordinates.Add(geocode);
            }

            var coordinateString = string.Join(";", coordinates.Select(coord =>
            {
                if (!coord.Longitude.HasValue || !coord.Latitude.HasValue)
                {
                    throw new Exception("Coordinate is missing latitude or longitude.");
                }

                return $"{coord.Longitude.Value.ToString(CultureInfo.InvariantCulture)},{coord.Latitude.Value.ToString(CultureInfo.InvariantCulture)}";
            }));

            var profile = _appOptions.Mapbox?.MatrixProfile
                          ?? _appOptions.Mapbox?.DirectionsProfile
                          ?? "driving";
            var response = await _mapboxClient.GetMatrixAsync(profile, coordinateString);
            if (response?.Durations == null)
            {
                throw new Exception("Failed to get distance matrix");
            }

            return response.Durations
                .Select(row => row.Select(duration => duration.HasValue ? (int)Math.Round(duration.Value) : 0).ToArray())
                .ToArray();
        }

        private static string NormalizeAddress(string address)
        {
            return string.Join(" ", address.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                .Trim()
                .ToLowerInvariant();
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
