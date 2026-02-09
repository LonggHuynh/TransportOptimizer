using System.Globalization;
using api.Externals;
using api.Models;

namespace api.Services
{
    public class DirectionsService(
        IGoogleMapsClient googleMapsClient,
        IGeocodeService geocodeService
    )
        : IDirectionsService
    {
        private readonly IGoogleMapsClient _googleMapsClient = googleMapsClient;
        private readonly IGeocodeService _geocodeService = geocodeService;

        public async Task<DirectionsResult?> GetDirectionsAsync(string from, string to)
        {
            var origin = TryParseCoordinate(from, out var parsedOrigin)
                ? parsedOrigin
                : await _geocodeService.GetGeocode(from, null);
            var destination = TryParseCoordinate(to, out var parsedDestination)
                ? parsedDestination
                : await _geocodeService.GetGeocode(to, null);

            if (origin?.Latitude == null || origin.Longitude == null ||
                destination?.Latitude == null || destination.Longitude == null)
            {
                return null;
            }

            var originLocation =
                $"{origin.Latitude.Value.ToString(CultureInfo.InvariantCulture)},{origin.Longitude.Value.ToString(CultureInfo.InvariantCulture)}";
            var destinationLocation =
                $"{destination.Latitude.Value.ToString(CultureInfo.InvariantCulture)},{destination.Longitude.Value.ToString(CultureInfo.InvariantCulture)}";

            var response = await _googleMapsClient.GetDirectionsAsync(
                originLocation,
                destinationLocation,
                "driving"
            );
            if (!IsGoogleOkStatus(response?.Status))
            {
                return null;
            }

            var route = response?.Routes?.FirstOrDefault();
            var encodedPath = route?.OverviewPolyline?.Points;
            if (string.IsNullOrWhiteSpace(encodedPath))
            {
                return null;
            }

            var points = DecodePolyline(encodedPath);
            if (points.Count == 0)
            {
                return null;
            }

            var distanceMeters = route?.Legs?.Sum(leg => leg.Distance?.Value ?? 0) ?? 0;
            var durationSeconds = route?.Legs?.Sum(leg => leg.Duration?.Value ?? 0) ?? 0;

            return new DirectionsResult
            {
                Coordinates = points,
                DistanceMeters = distanceMeters,
                DurationSeconds = durationSeconds,
            };
        }

        private static bool IsGoogleOkStatus(string? status) =>
            string.Equals(status, "OK", StringComparison.OrdinalIgnoreCase);

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
