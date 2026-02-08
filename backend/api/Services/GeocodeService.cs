using System.Linq;
using System.Threading.Tasks;
using System.Globalization;
using api.Configuration;
using api.Externals;
using api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace api.Services
{
    public class GeocodeService(IMapboxClient mapboxClient, IMemoryCache cache, AppOptions appOptions) : IGeocodeService
    {
        private readonly IMapboxClient _mapboxClient = mapboxClient;
        private readonly IMemoryCache _cache = cache;
        private readonly AppOptions _appOptions = appOptions;
        private const string NotFoundMarker = "__not_found__";
        private const string SuggestionTypes = "address,place,locality,neighborhood,region,country,postcode";

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

            var res = await _mapboxClient.ForwardGeocodeAsync(address);
            var center = res?.Features?.FirstOrDefault()?.Center;
            if (center == null || center.Length < 2)
            {
                _cache.Set(cacheKey, NotFoundMarker, new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_appOptions.Mapbox?.GeocodeFailureCacheMinutes ?? 10),
                });
                return null;
            }
            var geocode = new GeoCode
            {
                Longitude = center[0],
                Latitude = center[1],
            };
            _cache.Set(cacheKey, geocode, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_appOptions.Mapbox?.GeocodeCacheMinutes ?? 1440),
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

            var res = await _mapboxClient.ForwardGeocodeAutocompleteAsync(trimmed, clampedLimit, SuggestionTypes);
            var suggestions = new List<GeocodeSuggestion>();
            var dedupe = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var feature in res?.Features ?? [])
            {
                var label = feature.PlaceName ?? feature.Text;
                if (string.IsNullOrWhiteSpace(label) || feature.Center == null || feature.Center.Length < 2)
                {
                    continue;
                }

                var longitude = feature.Center[0];
                var latitude = feature.Center[1];
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
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(_appOptions.Mapbox?.GeocodeSuggestCacheMinutes ?? 60),
            });

            return suggestions;
        }

        private static string NormalizeAddress(string address)
        {
            return string.Join(" ", address.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                .Trim()
                .ToLowerInvariant();
        }
    }

}
