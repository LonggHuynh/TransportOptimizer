using api.Configuration;
using api.Externals.DTOs;
using Microsoft.Extensions.Caching.Memory;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace api.Externals;

public class GoogleTilesClient(HttpClient httpClient, AppOptions appOptions, IMemoryCache cache) : IGoogleTilesClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _httpClient = httpClient;
    private readonly AppOptions _appOptions = appOptions;
    private readonly IMemoryCache _cache = cache;

    private const string SessionCachePrefix = "google-map-tiles-session";
    private const int SessionExpirySkewMinutes = 1;

    public async Task<GoogleTile?> GetTileAsync(int tileSize, int z, int x, int y, string mapType)
    {
        if (z < 0 || x < 0 || y < 0)
        {
            return null;
        }

        var n = Math.Pow(2, z);
        if (x >= n || y >= n)
        {
            return null;
        }

        _ = tileSize;
        var normalizedMapType = NormalizeMapType(mapType);
        var apiKey = _appOptions.GoogleMaps?.ApiKey?.Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Google Maps API key is missing.");
        }

        var session = await GetOrCreateSessionAsync(normalizedMapType, apiKey);
        var url =
            $"2dtiles/{z}/{x}/{y}?session={Uri.EscapeDataString(session)}&key={Uri.EscapeDataString(apiKey)}";
        try
        {
            using var response = await _httpClient.GetAsync(url);
            var data = await response.Content.ReadAsByteArrayAsync();
            if (data.Length == 0)
            {
                return null;
            }

            var contentType = response.Content.Headers.ContentType?.MediaType ?? "image/png";
            return new GoogleTile(data, contentType);
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    private async Task<string> GetOrCreateSessionAsync(string normalizedMapType, string apiKey)
    {
        var cacheKey = $"{SessionCachePrefix}:{normalizedMapType}";
        if (_cache.TryGetValue(cacheKey, out string? cachedSession) && !string.IsNullOrWhiteSpace(cachedSession))
        {
            return cachedSession;
        }

        var requestBody = BuildCreateSessionRequest(normalizedMapType);
        var requestUrl = $"createSession?key={Uri.EscapeDataString(apiKey)}";
        using var request = new HttpRequestMessage(HttpMethod.Post, requestUrl)
        {
            Content = JsonContent.Create(requestBody),
        };
        using var response = await _httpClient.SendAsync(request);
        var payload = await response.Content.ReadFromJsonAsync<GoogleMapTilesCreateSessionResponse>(JsonOptions);
        var session = payload?.Session?.Trim();
        if (string.IsNullOrWhiteSpace(session))
        {
            throw new InvalidOperationException("Google Map Tiles API did not return a session token.");
        }

        var expiration = GetSessionExpiry(payload?.Expiry);
        _cache.Set(
            cacheKey,
            session,
            new MemoryCacheEntryOptions
            {
                AbsoluteExpiration = expiration,
            }
        );
        return session;
    }

    private GoogleMapTilesCreateSessionRequest BuildCreateSessionRequest(string normalizedMapType)
    {
        var language = _appOptions.GoogleMaps?.TileLanguage;
        var region = _appOptions.GoogleMaps?.TileRegion;
        var request = new GoogleMapTilesCreateSessionRequest
        {
            MapType = normalizedMapType,
            Language = string.IsNullOrWhiteSpace(language) ? "en-US" : language.Trim(),
            Region = string.IsNullOrWhiteSpace(region) ? "US" : region.Trim(),
            ImageFormat = "png",
        };

        if (normalizedMapType == "terrain")
        {
            request.LayerTypes = ["layerRoadmap"];
        }
        else if (normalizedMapType == "hybrid")
        {
            request.MapType = "satellite";
            request.LayerTypes = ["layerRoadmap"];
            request.Overlay = false;
        }

        return request;
    }

    private static DateTimeOffset GetSessionExpiry(string? expiry)
    {
        if (!string.IsNullOrWhiteSpace(expiry)
            && DateTimeOffset.TryParse(expiry, out var parsedExpiry)
            && parsedExpiry > DateTimeOffset.UtcNow.AddMinutes(SessionExpirySkewMinutes))
        {
            return parsedExpiry.AddMinutes(-SessionExpirySkewMinutes);
        }

        return DateTimeOffset.UtcNow.AddHours(1);
    }

    private static string NormalizeMapType(string mapType)
    {
        return mapType.Trim().ToLowerInvariant() switch
        {
            "satellite" => "satellite",
            "terrain" => "terrain",
            "hybrid" => "hybrid",
            _ => "roadmap",
        };
    }
}
