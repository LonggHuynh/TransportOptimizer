using System.Globalization;
using System.Net;
using api.Externals;
using api.Externals.DTOs;
using api.Models;

namespace api.Services
{
    public class DistanceService(
        IGoogleRoutesClient googleRoutesClient
    ) : IDistanceService
    {
        private const int GoogleMatrixMaxElements = 100;
        private readonly IGoogleRoutesClient _googleRoutesClient = googleRoutesClient;

        public async Task<int[][]> GetDistanceMatrixAsync(
            Coordinate[] places,
            DateTimeOffset? startTimeUtc,
            string? travelMode
        )
        {
            _ = startTimeUtc;

            if (places.Length == 0)
            {
                return [];
            }

            EnsureCoordinateValidity(places);

            var waypoints = places.Select(ToWaypoint).ToList();
            var request = new RoutesComputeRouteMatrixRequest
            {
                Origins = waypoints.Select(waypoint => new RoutesMatrixOrigin
                {
                    Waypoint = waypoint,
                }).ToList(),
                Destinations = waypoints.Select(waypoint => new RoutesMatrixDestination
                {
                    Waypoint = waypoint,
                }).ToList(),
                TravelMode = ToRoutesTravelMode(travelMode),
                RoutingPreference = null,
                DepartureTime = null,
            };

            var elements = await _googleRoutesClient.ComputeRouteMatrixAsync(request);
            return ToDurationMatrix(elements, places.Length);
        }

        private static int[][] ToDurationMatrix(
            IReadOnlyList<RoutesComputeRouteMatrixElement> elements,
            int locationCount
        )
        {
            if (elements.Count == 0)
            {
                throw new HttpRequestException(
                    "Upstream map service returned an empty distance matrix.",
                    null,
                    HttpStatusCode.BadGateway
                );
            }

            var matrix = Enumerable.Range(0, locationCount)
                .Select(_ => new int[locationCount])
                .ToArray();

            foreach (var element in elements)
            {
                if (element.OriginIndex is not int originIndex
                    || element.DestinationIndex is not int destinationIndex
                    || originIndex < 0
                    || destinationIndex < 0
                    || originIndex >= locationCount
                    || destinationIndex >= locationCount)
                {
                    continue;
                }

                if (element.Status?.Code is int statusCode && statusCode != 0)
                {
                    matrix[originIndex][destinationIndex] = 0;
                    continue;
                }

                if (!string.Equals(element.Condition, "ROUTE_EXISTS", StringComparison.OrdinalIgnoreCase))
                {
                    matrix[originIndex][destinationIndex] = 0;
                    continue;
                }

                var seconds = ParseDurationSeconds(element.StaticDuration)
                    ?? ParseDurationSeconds(element.Duration)
                    ?? 0;
                matrix[originIndex][destinationIndex] = seconds;
            }

            return matrix;
        }

        private static RoutesWaypoint ToWaypoint(Coordinate coordinate)
        {
            return new RoutesWaypoint
            {
                Location = new RoutesLocation
                {
                    LatLng = new RoutesLatLng
                    {
                        Latitude = coordinate.Latitude,
                        Longitude = coordinate.Longitude,
                    },
                },
            };
        }

        private static int? ParseDurationSeconds(string? durationText)
        {
            if (string.IsNullOrWhiteSpace(durationText))
            {
                return null;
            }

            var trimmed = durationText.Trim();
            if (!trimmed.EndsWith('s'))
            {
                return null;
            }

            var numericPart = trimmed[..^1];
            if (!double.TryParse(numericPart, NumberStyles.Float, CultureInfo.InvariantCulture, out var seconds))
            {
                return null;
            }

            return (int)Math.Round(seconds, MidpointRounding.AwayFromZero);
        }

        private static string ToRoutesTravelMode(string? travelMode)
        {
            return travelMode?.Trim().ToLowerInvariant() switch
            {
                "walking" => "WALK",
                "bicycling" => "BICYCLE",
                "cycling" => "BICYCLE",
                "transit" => "TRANSIT",
                _ => "DRIVE",
            };
        }

        private static void EnsureCoordinateValidity(IReadOnlyList<Coordinate> coordinates)
        {
            for (var index = 0; index < coordinates.Count; index += 1)
            {
                var latitude = coordinates[index].Latitude;
                var longitude = coordinates[index].Longitude;
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
    }
}
