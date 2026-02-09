using System.Linq;
using System.Threading.Tasks;
using api.Externals;
using api.Middlewares;
using api.Models;

namespace api.Services
{
    public class GeocodeService(IGoogleMapsClient googleMapsClient) : IGeocodeService
    {
        private readonly IGoogleMapsClient _googleMapsClient = googleMapsClient;

        public async Task<GeoCode?> GetGeocode(string? address, string? placeId = null)
        {
            var normalizedPlaceId = placeId?.Trim();
            var normalizedAddress = address?.Trim();
            if (string.IsNullOrWhiteSpace(normalizedAddress) && string.IsNullOrWhiteSpace(normalizedPlaceId))
            {
                return null;
            }

            var res = !string.IsNullOrWhiteSpace(normalizedPlaceId)
                ? await _googleMapsClient.ForwardGeocodeByPlaceIdAsync(normalizedPlaceId)
                : await _googleMapsClient.ForwardGeocodeAsync(normalizedAddress!);
            if (res is null)
            {
                throw new GoogleMapsApiException("Google geocode request failed.");
            }

            if (IsGoogleDeniedStatus(res.Status))
            {
                throw new GoogleMapsApiException($"Google geocode request denied: {res.Status}");
            }

            var location = res?.Results?.FirstOrDefault()?.Geometry?.Location;
            if (!IsGoogleOkStatus(res?.Status) || location == null)
            {
                return null;
            }

            return new GeoCode
            {
                Longitude = location.Longitude,
                Latitude = location.Latitude,
            };
        }

        public async Task<IReadOnlyList<GeocodeSuggestion>> GetSuggestions(string query, int limit)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return [];
            }

            var trimmed = query.Trim();
            if (trimmed.Length < 3)
            {
                return Array.Empty<GeocodeSuggestion>();
            }

            var clampedLimit = Math.Max(1, Math.Min(limit, 10));
            var res = await _googleMapsClient.ForwardGeocodeAutocompleteAsync(trimmed, clampedLimit);
            var suggestions = new List<GeocodeSuggestion>();
            var dedupe = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (res is null)
            {
                throw new GoogleMapsApiException("Google place autocomplete request failed.");
            }

            if (IsGoogleDeniedStatus(res.Status))
            {
                throw new GoogleMapsApiException($"Google place autocomplete denied: {res.Status}");
            }

            if (!IsGoogleOkStatus(res?.Status))
            {
                return suggestions;
            }

            foreach (var prediction in res?.Predictions ?? [])
            {
                var label = prediction.Description?.Trim();
                if (string.IsNullOrWhiteSpace(label))
                {
                    continue;
                }

                var placeId = prediction.PlaceId?.Trim();
                var dedupeKey = !string.IsNullOrWhiteSpace(placeId)
                    ? $"place:{placeId.ToLowerInvariant()}"
                    : $"label:{NormalizeAddress(label)}";
                if (!dedupe.Add(dedupeKey))
                {
                    continue;
                }

                suggestions.Add(new GeocodeSuggestion
                {
                    Label = label,
                    PlaceId = placeId,
                });

                if (suggestions.Count >= clampedLimit)
                {
                    break;
                }
            }

            return suggestions;
        }

        private static bool IsGoogleOkStatus(string? status) =>
            string.Equals(status, "OK", StringComparison.OrdinalIgnoreCase);
        private static bool IsGoogleDeniedStatus(string? status) =>
            string.Equals(status, "REQUEST_DENIED", StringComparison.OrdinalIgnoreCase)
            || string.Equals(status, "OVER_DAILY_LIMIT", StringComparison.OrdinalIgnoreCase)
            || string.Equals(status, "OVER_QUERY_LIMIT", StringComparison.OrdinalIgnoreCase);

        private static string NormalizeAddress(string address)
        {
            return string.Join(" ", address.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                .Trim()
                .ToLowerInvariant();
        }
    }

}
