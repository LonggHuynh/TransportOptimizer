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

    public async Task<GoogleGeocodeResponse?> ForwardGeocodeAsync(string address)
    {
        if (string.IsNullOrWhiteSpace(_apiKey) || string.IsNullOrWhiteSpace(address))
        {
            return null;
        }

        var url =
            $"/geocode/json?address={Uri.EscapeDataString(address)}&key={Uri.EscapeDataString(_apiKey)}";
        return await _httpClient.GetFromJsonAsync<GoogleGeocodeResponse>(url, JsonOptions);
    }

    public async Task<GoogleGeocodeResponse?> ForwardGeocodeByPlaceIdAsync(string placeId)
    {
        if (string.IsNullOrWhiteSpace(_apiKey) || string.IsNullOrWhiteSpace(placeId))
        {
            return null;
        }

        var url =
            $"/geocode/json?place_id={Uri.EscapeDataString(placeId)}&key={Uri.EscapeDataString(_apiKey)}";
        return await _httpClient.GetFromJsonAsync<GoogleGeocodeResponse>(url, JsonOptions);
    }

    public async Task<GooglePlacesAutocompleteResponse?> ForwardGeocodeAutocompleteAsync(
        string query,
        int limit
    )
    {
        if (string.IsNullOrWhiteSpace(_apiKey) || string.IsNullOrWhiteSpace(query))
        {
            return null;
        }

        var clampedLimit = Math.Max(1, Math.Min(limit, 10));
        var url =
            $"/place/autocomplete/json?input={Uri.EscapeDataString(query)}&types=geocode&key={Uri.EscapeDataString(_apiKey)}";
        var response = await _httpClient.GetFromJsonAsync<GooglePlacesAutocompleteResponse>(url, JsonOptions);
        if (response?.Predictions is { Count: > 0 })
        {
            response.Predictions = response.Predictions.Take(clampedLimit).ToList();
        }

        return response;
    }

    public async Task<GoogleDirectionsResponse?> GetDirectionsAsync(
        string origin,
        string destination,
        string travelMode
    )
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            return null;
        }

        var mode = string.IsNullOrWhiteSpace(travelMode) ? "driving" : travelMode;
        var url =
            $"/directions/json?origin={Uri.EscapeDataString(origin)}&destination={Uri.EscapeDataString(destination)}&mode={Uri.EscapeDataString(mode)}&key={Uri.EscapeDataString(_apiKey)}";
        return await _httpClient.GetFromJsonAsync<GoogleDirectionsResponse>(url, JsonOptions);
    }
}
