using System.Linq;
using System.Threading.Tasks;
using System.Globalization;
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

        public async Task<GeoCode?> GetGeocode(string address)
        {
            if (string.IsNullOrWhiteSpace(address))
            {
                return null;
            }

            var normalized = NormalizeAddress(address);
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

            var res = await _googleMapsClient.ForwardGeocodeAsync(address);
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
                if (string.IsNullOrWhiteSpace(prediction.PlaceId))
                {
                    continue;
                }

                var placeGeocodeResponse = await _googleMapsClient.ForwardGeocodeByPlaceIdAsync(prediction.PlaceId);
                var placeResult = placeGeocodeResponse?.Results?.FirstOrDefault();
                var location = placeResult?.Geometry?.Location;
                if (!IsGoogleOkStatus(placeGeocodeResponse?.Status) || location == null)
                {
                    continue;
                }

                var label = prediction.Description ?? placeResult?.FormattedAddress;
                if (string.IsNullOrWhiteSpace(label))
                {
                    continue;
                }

                var longitude = location.Longitude;
                var latitude = location.Latitude;
                var dedupeKey = $"{NormalizeAddress(label)}|{longitude.ToString("F6", CultureInfo.InvariantCulture)}|{latitude.ToString("F6", CultureInfo.InvariantCulture)}";
                if (!dedupe.Add(dedupeKey))
                {
                    continue;
                }

                suggestions.Add(new GeocodeSuggestion
                {
                    Label = label,
                    Longitude = longitude,
                    Latitude = latitude,
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
