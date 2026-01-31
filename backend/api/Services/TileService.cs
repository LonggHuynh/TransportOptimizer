using System.Security.Cryptography;
using api.Configuration;
using api.Externals;
using Microsoft.Extensions.Caching.Memory;

namespace api.Services
{
    public class TileService(IMapboxClient mapboxClient, AppOptions appOptions, IMemoryCache cache) : ITileService
    {
        private readonly IMapboxClient _mapboxClient = mapboxClient;
        private readonly AppOptions _appOptions = appOptions;
        private readonly IMemoryCache _cache = cache;

        private const int CacheHours = 12;
        private const int NotFoundCacheMinutes = 10;
        private const string NotFoundMarker = "__not_found__";
        private const string CacheControlValue = "public, max-age=86400";

        private sealed record CachedTile(byte[] Data, string ContentType, string ETag);

        public async Task<TileServiceResult> GetTileAsync(int z, int x, int y, string? ifNoneMatch)
        {
            var styleId = _appOptions.Mapbox?.TileStyleId;
            if (string.IsNullOrWhiteSpace(styleId))
            {
                return new TileServiceResult(StatusCodes.Status400BadRequest, null, null, null, null,
                    "Mapbox tile style is missing.");
            }

            var tileSize = ResolveTileSize(_appOptions.Mapbox);
            var cacheKey = $"tiles:{styleId}:{tileSize}:{z}:{x}:{y}";
            if (_cache.TryGetValue(cacheKey, out object? cached))
            {
                if (cached is string marker && marker == NotFoundMarker)
                {
                    return new TileServiceResult(StatusCodes.Status404NotFound, null, null, null, CacheControlValue, null);
                }

                if (cached is CachedTile cachedTile)
                {
                    if (!string.IsNullOrWhiteSpace(ifNoneMatch) && ifNoneMatch.Contains(cachedTile.ETag))
                    {
                        return new TileServiceResult(StatusCodes.Status304NotModified, null, null, cachedTile.ETag, CacheControlValue, null);
                    }

                    return new TileServiceResult(StatusCodes.Status200OK, cachedTile.Data, cachedTile.ContentType, cachedTile.ETag, CacheControlValue, null);
                }
            }

            var tile = await _mapboxClient.GetTileAsync(styleId, tileSize, z, x, y);
            if (tile == null)
            {
                _cache.Set(cacheKey, NotFoundMarker, new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(NotFoundCacheMinutes),
                });
                return new TileServiceResult(StatusCodes.Status404NotFound, null, null, null, CacheControlValue, null);
            }

            var etag = ComputeETag(tile.Data);
            var cachedTileEntry = new CachedTile(tile.Data, tile.ContentType, etag);
            _cache.Set(cacheKey, cachedTileEntry, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(CacheHours),
            });

            return new TileServiceResult(StatusCodes.Status200OK, tile.Data, tile.ContentType, etag, CacheControlValue, null);
        }

        private static int ResolveTileSize(MapboxOptions? options)
        {
            var resolution = options?.TileResolution?.Trim().ToLowerInvariant();
            return resolution switch
            {
                "high" => 512,
                "low" => 256,
                _ => options?.TileSize ?? 256,
            };
        }

        private static string ComputeETag(byte[] data)
        {
            var hash = SHA256.HashData(data);
            return $"\"{Convert.ToHexString(hash)}\"";
        }
    }
}
