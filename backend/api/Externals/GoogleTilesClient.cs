using System.Globalization;
using api.Configuration;

namespace api.Externals;

public class GoogleTilesClient(HttpClient httpClient, AppOptions appOptions) : IGoogleTilesClient
{
    private readonly HttpClient _httpClient = httpClient;
    private readonly AppOptions _appOptions = appOptions;

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

        var normalizedTileSize = Math.Clamp(tileSize, 64, 640);
        var normalizedMapType = string.IsNullOrWhiteSpace(mapType)
            ? "roadmap"
            : mapType.Trim().ToLowerInvariant();
        var apiKey = _appOptions.GoogleMaps?.ApiKey?.Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Google Maps API key is missing.");
        }

        var center = GetTileCenter(z, x, y);
        var url =
            $"staticmap?center={center.Latitude},{center.Longitude}&zoom={z}&size={normalizedTileSize}x{normalizedTileSize}&maptype={Uri.EscapeDataString(normalizedMapType)}&format=png&scale=1&key={Uri.EscapeDataString(apiKey)}";
        using var response = await _httpClient.GetAsync(url);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        var data = await response.Content.ReadAsByteArrayAsync();
        if (data.Length == 0)
        {
            return null;
        }

        var contentType = response.Content.Headers.ContentType?.MediaType ?? "image/png";
        return new GoogleTile(data, contentType);
    }

    private static (string Latitude, string Longitude) GetTileCenter(int z, int x, int y)
    {
        var n = Math.Pow(2, z);
        var centerX = x + 0.5;
        var centerY = y + 0.5;
        var longitude = (centerX / n) * 360.0 - 180.0;
        var latitudeRadians = Math.Atan(Math.Sinh(Math.PI * (1.0 - (2.0 * centerY / n))));
        var latitude = latitudeRadians * (180.0 / Math.PI);
        return (
            latitude.ToString(CultureInfo.InvariantCulture),
            longitude.ToString(CultureInfo.InvariantCulture)
        );
    }
}
