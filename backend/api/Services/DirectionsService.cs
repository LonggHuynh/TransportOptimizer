using System.Globalization;
using api.Externals;
using api.Externals.DTOs;
using api.Models;

namespace api.Services
{
    public class DirectionsService(
        IGoogleRoutesClient googleRoutesClient,
        IGeocodeService geocodeService
    )
        : IDirectionsService
    {
        private readonly IGoogleRoutesClient _googleRoutesClient = googleRoutesClient;
        private readonly IGeocodeService _geocodeService = geocodeService;

        public async Task<DirectionsResult?> GetDirectionsAsync(string from, string to)
        {
            var origin = TryParseCoordinate(from, out var parsedOrigin)
                ? parsedOrigin
                : await _geocodeService.GetGeocode(from, null);
            var destination = TryParseCoordinate(to, out var parsedDestination)
                ? parsedDestination
                : await _geocodeService.GetGeocode(to, null);

            if (origin?.Latitude == null
                || origin.Longitude == null
                || destination?.Latitude == null
                || destination.Longitude == null)
            {
                return null;
            }

            var response = await _googleRoutesClient.ComputeRoutesAsync(new RoutesComputeRoutesRequest
            {
                Origin = ToWaypoint(origin),
                Destination = ToWaypoint(destination),
                TravelMode = "DRIVE",
                RoutingPreference = "TRAFFIC_AWARE",
            });

            var route = response?.Routes?.FirstOrDefault();
            var encodedPath = route?.Polyline?.EncodedPolyline;
            if (string.IsNullOrWhiteSpace(encodedPath))
            {
                return null;
            }

            var points = DecodePolyline(encodedPath);
            if (points.Count == 0)
            {
                return null;
            }

            return new DirectionsResult
            {
                Coordinates = points,
                DistanceMeters = route?.DistanceMeters ?? 0,
                DurationSeconds = ParseDurationSeconds(route?.Duration) ?? 0,
            };
        }

        private static RoutesWaypoint ToWaypoint(GeoCode point)
        {
            return new RoutesWaypoint
            {
                Location = new RoutesLocation
                {
                    LatLng = new RoutesLatLng
                    {
                        Latitude = point.Latitude!.Value,
                        Longitude = point.Longitude!.Value,
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

            if (!double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var latitude)
                || !double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var longitude))
            {
                return false;
            }

            coordinate = new GeoCode
            {
                Latitude = latitude,
                Longitude = longitude,
            };
            return true;
        }

        private static List<GeoCode> DecodePolyline(string encodedPath)
        {
            var points = new List<GeoCode>();
            var index = 0;
            var latitude = 0;
            var longitude = 0;

            while (index < encodedPath.Length)
            {
                latitude += DecodeSignedValue(encodedPath, ref index);
                longitude += DecodeSignedValue(encodedPath, ref index);
                points.Add(new GeoCode
                {
                    Latitude = latitude / 1e5,
                    Longitude = longitude / 1e5,
                });
            }

            return points;
        }

        private static int DecodeSignedValue(string encodedPath, ref int index)
        {
            var result = 0;
            var shift = 0;
            int value;
            do
            {
                if (index >= encodedPath.Length)
                {
                    return 0;
                }

                value = encodedPath[index++] - 63;
                result |= (value & 0x1f) << shift;
                shift += 5;
            } while (value >= 0x20);

            return (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
        }
    }
}
