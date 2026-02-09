using System.Globalization;
using api.Configuration;
using api.Externals;
using api.Externals.DTOs;
using api.Models;

namespace api.Services
{
    public class DistanceService(
        IMapboxClient mapboxClient,
        IGoogleMapsClient googleMapsClient,
        IGeocodeService geocodeService,
        AppOptions appOptions
    ) : IDistanceService
    {
        private readonly IMapboxClient _mapboxClient = mapboxClient;
        private readonly IGoogleMapsClient _googleMapsClient = googleMapsClient;
        private readonly IGeocodeService _geocodeService = geocodeService;
        private readonly AppOptions _appOptions = appOptions;

        public async Task<int[][]> GetDistanceMatrixAsync(string[] places, DateTimeOffset? startTimeUtc, string? travelMode)
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

            var normalizedTravelMode = NormalizeTravelMode(travelMode);
            var googleCoordinateString = string.Join("|", coordinates.Select(coord =>
            {
                if (!coord.Longitude.HasValue || !coord.Latitude.HasValue)
                {
                    throw new Exception("Coordinate is missing latitude or longitude.");
                }

                return $"{coord.Latitude.Value.ToString(CultureInfo.InvariantCulture)},{coord.Longitude.Value.ToString(CultureInfo.InvariantCulture)}";
            }));

            var googleResponse = await _googleMapsClient.GetDistanceMatrixAsync(
                googleCoordinateString,
                googleCoordinateString,
                normalizedTravelMode,
                startTimeUtc
            );
            if (googleResponse is not null)
            {
                var shouldUseTrafficDuration = normalizedTravelMode == "driving" && startTimeUtc.HasValue;
                return ToGoogleDurationMatrix(googleResponse, coordinates.Count, shouldUseTrafficDuration);
            }

            var mapboxProfile = ResolveMapboxProfile(normalizedTravelMode);
            if (string.IsNullOrWhiteSpace(mapboxProfile))
            {
                throw new Exception("Transit mode requires Google Maps Distance Matrix API key configuration.");
            }

            var mapboxCoordinateString = string.Join(";", coordinates.Select(coord =>
            {
                if (!coord.Longitude.HasValue || !coord.Latitude.HasValue)
                {
                    throw new Exception("Coordinate is missing latitude or longitude.");
                }

                return $"{coord.Longitude.Value.ToString(CultureInfo.InvariantCulture)},{coord.Latitude.Value.ToString(CultureInfo.InvariantCulture)}";
            }));

            var response = await _mapboxClient.GetMatrixAsync(mapboxProfile, mapboxCoordinateString);
            if (response?.Durations == null)
            {
                throw new Exception("Failed to get distance matrix");
            }

            return response.Durations
                .Select(row => row.Select(duration => duration.HasValue ? (int)Math.Round(duration.Value) : 0).ToArray())
                .ToArray();
        }

        private string? ResolveMapboxProfile(string normalizedTravelMode)
        {
            return normalizedTravelMode switch
            {
                "driving" => _appOptions.Mapbox?.MatrixProfile
                    ?? _appOptions.Mapbox?.DirectionsProfile
                    ?? "driving",
                "walking" => "walking",
                "bicycling" => "cycling",
                _ => null,
            };
        }

        private static int[][] ToGoogleDurationMatrix(
            GoogleDistanceMatrixResponse response,
            int expectedLocationCount,
            bool shouldUseTrafficDuration
        )
        {
            if (!string.Equals(response.Status, "OK", StringComparison.OrdinalIgnoreCase))
            {
                throw new Exception($"Google distance matrix request failed with status: {response.Status ?? "UNKNOWN_ERROR"}");
            }

            if (response.Rows == null || response.Rows.Count != expectedLocationCount)
            {
                throw new Exception("Google distance matrix response has invalid row count.");
            }

            var matrix = new int[expectedLocationCount][];
            for (var rowIndex = 0; rowIndex < expectedLocationCount; rowIndex += 1)
            {
                var row = response.Rows[rowIndex];
                if (row.Elements == null || row.Elements.Count != expectedLocationCount)
                {
                    throw new Exception("Google distance matrix response has invalid element count.");
                }

                matrix[rowIndex] = row.Elements
                    .Select(element => GetElementDurationSeconds(element, shouldUseTrafficDuration))
                    .ToArray();
            }

            return matrix;
        }

        private static int GetElementDurationSeconds(
            GoogleDistanceMatrixElement element,
            bool shouldUseTrafficDuration
        )
        {
            if (!string.Equals(element.Status, "OK", StringComparison.OrdinalIgnoreCase))
            {
                return 0;
            }

            if (shouldUseTrafficDuration && element.DurationInTraffic?.Value is int durationInTraffic)
            {
                return durationInTraffic;
            }

            return element.Duration?.Value
                ?? element.DurationInTraffic?.Value
                ?? 0;
        }

        private static string NormalizeTravelMode(string? travelMode)
        {
            if (string.IsNullOrWhiteSpace(travelMode))
            {
                return "driving";
            }

            return travelMode.Trim().ToLowerInvariant() switch
            {
                "driving" => "driving",
                "walking" => "walking",
                "bicycling" => "bicycling",
                "cycling" => "bicycling",
                "transit" => "transit",
                _ => "driving",
            };
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
