using System.Globalization;
using api.Externals;
using api.Externals.DTOs;
using api.Middlewares;
using api.Models;

namespace api.Services
{
    public class DistanceService(
        IGoogleMapsClient googleMapsClient
    ) : IDistanceService
    {
        private readonly IGoogleMapsClient _googleMapsClient = googleMapsClient;

        public async Task<int[][]> GetDistanceMatrixAsync(Coordinate[] places, DateTimeOffset? startTimeUtc, string? travelMode)
        {
            if (places.Length == 0)
            {
                return [];
            }

            var coordinates = places.Select(place => new GeoCode
            {
                Latitude = place.Latitude,
                Longitude = place.Longitude,
            }).ToList();

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
            if (googleResponse is null)
            {
                throw new GoogleMapsApiException("Google Maps Distance Matrix API key is missing or invalid.");
            }

            var shouldUseTrafficDuration = normalizedTravelMode == "driving" && startTimeUtc.HasValue;
            return ToGoogleDurationMatrix(googleResponse, coordinates.Count, shouldUseTrafficDuration);
        }

        private static int[][] ToGoogleDurationMatrix(
            GoogleDistanceMatrixResponse response,
            int expectedLocationCount,
            bool shouldUseTrafficDuration
        )
        {
            if (!string.Equals(response.Status, "OK", StringComparison.OrdinalIgnoreCase))
            {
                throw new GoogleMapsApiException(
                    $"Google distance matrix request failed with status: {response.Status ?? "UNKNOWN_ERROR"}"
                );
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
    }
}
