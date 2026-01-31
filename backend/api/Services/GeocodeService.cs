using System.Linq;
using System.Threading.Tasks;
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

        private static string NormalizeAddress(string address)
        {
            return string.Join(" ", address.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                .Trim()
                .ToLowerInvariant();
        }
    }

}
