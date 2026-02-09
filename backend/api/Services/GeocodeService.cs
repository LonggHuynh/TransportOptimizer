using System.Linq;
using System.Threading.Tasks;
using api.Externals;
using api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace api.Services
{
    public class GeocodeService(
        IGoogleMapsClient googleMapsClient,
        IMemoryCache cache
    ) : IGeocodeService
    {
        private readonly IGoogleMapsClient _googleMapsClient = googleMapsClient;
        private readonly IMemoryCache _cache = cache;
        private const string NotFoundMarker = "__not_found__";
        private const int GeocodeCacheMinutes = 1440;
        private const int GeocodeFailureCacheMinutes = 10;
        private const int GeocodeSuggestCacheMinutes = 60;

        public async Task<GeoCode?> GetGeocode(string? address, string? placeId = null)
        {
            var normalizedPlaceId = placeId?.Trim();
            var normalizedAddress = address?.Trim();
            if (string.IsNullOrWhiteSpace(normalizedAddress) && string.IsNullOrWhiteSpace(normalizedPlaceId))
            {
                return null;
            }

            var normalized = !string.IsNullOrWhiteSpace(normalizedPlaceId)
                ? $"placeid:{normalizedPlaceId.ToLowerInvariant()}"
                : NormalizeAddress(normalizedAddress!);
            var cacheKey = $"geocode:{normalized}";
            if (_cache.TryGetValue(cacheKey, out object? cached))
            {
                if (cached is string marker && marker == NotFoundMarker)
                {
                    return null;
                }

                if (cached is GeoCode geoCode)
                {
                    return geoCode;
                }
            }

            var res = !string.IsNullOrWhiteSpace(normalizedPlaceId)
                ? await _googleMapsClient.ForwardGeocodeByPlaceIdAsync(normalizedPlaceId)
                : await _googleMapsClient.ForwardGeocodeAsync(normalizedAddress!);
            var location = res?.Results?.FirstOrDefault()?.Geometry?.Location;
            if (!IsGoogleOkStatus(res?.Status) || location == null)
            {
                _cache.Set(cacheKey, NotFoundMarker, new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(GeocodeFailureCacheMinutes),
                });
                return null;
            }

            var geocode = new GeoCode
            {
                Longitude = location.Longitude,
                Latitude = location.Latitude,
            };
            _cache.Set(cacheKey, geocode, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(GeocodeCacheMinutes),
            });
            return geocode;
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

            var normalized = NormalizeAddress(trimmed);
            var clampedLimit = Math.Max(1, Math.Min(limit, 10));
            var cacheKey = $"geocode:suggest:{clampedLimit}:{normalized}";
            if (_cache.TryGetValue(cacheKey, out object? cached) && cached is List<GeocodeSuggestion> cachedList)
            {
                return cachedList;
            }

            var res = await _googleMapsClient.ForwardGeocodeAutocompleteAsync(trimmed, clampedLimit);
            var suggestions = new List<GeocodeSuggestion>();
            var dedupe = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
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

            _cache.Set(cacheKey, suggestions, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(GeocodeSuggestCacheMinutes),
            });

            return suggestions;
        }

        private static bool IsGoogleOkStatus(string? status) =>
            string.Equals(status, "OK", StringComparison.OrdinalIgnoreCase);

        private static string NormalizeAddress(string address)
        {
            return string.Join(" ", address.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                .Trim()
                .ToLowerInvariant();
        }
    }

}
