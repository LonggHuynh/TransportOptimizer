using System.Net.Http.Json;
using System.Text.Json;
using api.Configuration;
using api.Externals.DTOs;

namespace api.Externals;

public class GoogleMapsClient(HttpClient httpClient, AppOptions appOptions) : IGoogleMapsClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _httpClient = httpClient;
    private readonly string? _apiKey = appOptions.GoogleMaps?.ApiKey;

    public async Task<GoogleDistanceMatrixResponse?> GetDistanceMatrixAsync(
        string origins,
        string destinations,
        string travelMode,
        DateTimeOffset? departureTimeUtc
    )
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            return null;
        }

        var queryParts = new List<string>
        {
            $"origins={Uri.EscapeDataString(origins)}",
            $"destinations={Uri.EscapeDataString(destinations)}",
            $"mode={Uri.EscapeDataString(travelMode)}",
        };

        if (departureTimeUtc.HasValue)
        {
            queryParts.Add($"departure_time={departureTimeUtc.Value.ToUnixTimeSeconds()}");
        }

        queryParts.Add($"key={Uri.EscapeDataString(_apiKey)}");

        var url = $"/distancematrix/json?{string.Join("&", queryParts)}";
        return await _httpClient.GetFromJsonAsync<GoogleDistanceMatrixResponse>(url, JsonOptions);
    }
}
