using System.Net;
using System.Globalization;
using api.Externals;
using api.Externals.DTOs;
using api.Models;

namespace api.Services
{
    public class DistanceService(
        IGoogleMapsClient googleMapsClient
    ) : IDistanceService
    {
        private const int GoogleMatrixMaxElements = 100;
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
            EnsureCoordinateValidity(coordinates);
            EnsureMatrixElementLimit(coordinates.Count);

            var normalizedTravelMode = NormalizeTravelMode(travelMode);
            var googleCoordinateString = string.Join("|", coordinates.Select(coord =>
            {
                if (!coord.Longitude.HasValue || !coord.Latitude.HasValue)
                {
                    throw new HttpRequestException(
                        "One or more locations are missing coordinates. Please reselect the locations and try again.",
                        null,
                        HttpStatusCode.BadRequest
                    );
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
                throw new HttpRequestException(
                    "Upstream map service did not return a response.",
                    null,
                    HttpStatusCode.BadGateway
                );
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
                throw new HttpRequestException(
                    string.IsNullOrWhiteSpace(response.ErrorMessage)
                        ? "Upstream map service request failed."
                        : response.ErrorMessage.Trim(),
                    null,
                    HttpStatusCode.BadGateway
                );
            }

            if (response.Rows == null || response.Rows.Count != expectedLocationCount)
            {
                throw new HttpRequestException(
                    "Upstream map service returned an invalid response.",
                    null,
                    HttpStatusCode.BadGateway
                );
            }

            var matrix = new int[expectedLocationCount][];
            for (var rowIndex = 0; rowIndex < expectedLocationCount; rowIndex += 1)
            {
                var row = response.Rows[rowIndex];
                if (row.Elements == null || row.Elements.Count != expectedLocationCount)
                {
                    throw new HttpRequestException(
                        "Upstream map service returned an invalid response.",
                        null,
                        HttpStatusCode.BadGateway
                    );
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

        private static void EnsureCoordinateValidity(IReadOnlyList<GeoCode> coordinates)
        {
            for (var index = 0; index < coordinates.Count; index += 1)
            {
                var coordinate = coordinates[index];
                if (coordinate.Latitude is not double latitude || coordinate.Longitude is not double longitude)
                {
                    throw new HttpRequestException(
                        $"Location {index + 1} is missing coordinates. Please select locations from suggestions.",
                        null,
                        HttpStatusCode.BadRequest
                    );
                }

                if (double.IsNaN(latitude)
                    || double.IsInfinity(latitude)
                    || latitude < -90
                    || latitude > 90
                    || double.IsNaN(longitude)
                    || double.IsInfinity(longitude)
                    || longitude < -180
                    || longitude > 180)
                {
                    throw new HttpRequestException(
                        $"Location {index + 1} has invalid coordinates.",
                        null,
                        HttpStatusCode.BadRequest
                    );
                }
            }
        }

        private static void EnsureMatrixElementLimit(int locationCount)
        {
            var matrixElements = locationCount * locationCount;
            if (matrixElements <= GoogleMatrixMaxElements)
            {
                return;
            }

            throw new HttpRequestException(
                $"Too many locations for one optimization request ({locationCount}). Reduce the number of locations and try again.",
                null,
                HttpStatusCode.BadRequest
            );
        }
    }
}
