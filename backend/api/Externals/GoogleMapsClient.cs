using System.Net.Http.Json;
using System.Text.Json;
using api.Externals.DTOs;

namespace api.Externals;

public class GoogleMapsClient(HttpClient httpClient) : IGoogleMapsClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _httpClient = httpClient;

    public async Task<GoogleDistanceMatrixResponse?> GetDistanceMatrixAsync(
        string origins,
        string destinations,
        string travelMode,
        DateTimeOffset? departureTimeUtc
    )
    {
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

        var url = $"distancematrix/json?{string.Join("&", queryParts)}";
        return await _httpClient.GetFromJsonAsync<GoogleDistanceMatrixResponse>(url, JsonOptions);
    }

    public async Task<GoogleGeocodeResponse?> ForwardGeocodeAsync(string address)
    {
        if (string.IsNullOrWhiteSpace(address))
        {
            return null;
        }

        var url = $"geocode/json?address={Uri.EscapeDataString(address)}";
        return await _httpClient.GetFromJsonAsync<GoogleGeocodeResponse>(url, JsonOptions);
    }

    public async Task<GoogleGeocodeResponse?> ForwardGeocodeByPlaceIdAsync(string placeId)
    {
        if (string.IsNullOrWhiteSpace(placeId))
        {
            return null;
        }

        var url = $"geocode/json?place_id={Uri.EscapeDataString(placeId)}";
        return await _httpClient.GetFromJsonAsync<GoogleGeocodeResponse>(url, JsonOptions);
    }

    public async Task<GooglePlacesAutocompleteResponse?> ForwardGeocodeAutocompleteAsync(
        string query,
        int limit
    )
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return null;
        }

        var clampedLimit = Math.Max(1, Math.Min(limit, 10));
        var url = $"place/autocomplete/json?input={Uri.EscapeDataString(query)}&types=geocode";
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
        var mode = string.IsNullOrWhiteSpace(travelMode) ? "driving" : travelMode;
        var url = $"directions/json?origin={Uri.EscapeDataString(origin)}&destination={Uri.EscapeDataString(destination)}&mode={Uri.EscapeDataString(mode)}";
        return await _httpClient.GetFromJsonAsync<GoogleDirectionsResponse>(url, JsonOptions);
    }
}
