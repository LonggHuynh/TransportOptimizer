using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using api.Externals.DTOs;

namespace api.Externals;

public class GoogleMapsClient(HttpClient httpClient) : IGoogleMapsClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _httpClient = httpClient;

    private const string PlacesAutocompleteFieldMask =
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text";
    private const string PlaceDetailsFieldMask =
        "id,displayName.text,formattedAddress,location";
    private const string PlacesApiBaseUrl = "https://places.googleapis.com/v1/";

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

        var normalizedPlaceId = placeId.StartsWith("places/", StringComparison.OrdinalIgnoreCase)
            ? placeId["places/".Length..]
            : placeId;

        var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{PlacesApiBaseUrl}places/{Uri.EscapeDataString(normalizedPlaceId)}"
        );
        request.Headers.TryAddWithoutValidation("X-Goog-FieldMask", PlaceDetailsFieldMask);

        var httpResponse = await _httpClient.SendAsync(request);
        if (!httpResponse.IsSuccessStatusCode)
        {
            return new GoogleGeocodeResponse
            {
                Status = "REQUEST_DENIED",
                Results = [],
            };
        }

        var payload = await httpResponse.Content.ReadFromJsonAsync<PlaceDetailsResponse>(JsonOptions);
        if (payload?.Location == null)
        {
            return new GoogleGeocodeResponse
            {
                Status = "ZERO_RESULTS",
                Results = [],
            };
        }

        var formattedAddress = payload.FormattedAddress ?? payload.DisplayName?.Text;
        var geocodeResult = new GoogleGeocodeResult
        {
            PlaceId = payload.Id,
            FormattedAddress = formattedAddress,
            Geometry = new GoogleGeocodeGeometry
            {
                Location = new GoogleGeocodeLocation
                {
                    Latitude = payload.Location.Latitude,
                    Longitude = payload.Location.Longitude,
                },
            },
        };

        return new GoogleGeocodeResponse
        {
            Status = "OK",
            Results = [geocodeResult],
        };
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
        var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"{PlacesApiBaseUrl}places:autocomplete"
        )
        {
            Content = JsonContent.Create(new PlacesAutocompleteRequest
            {
                Input = query,
                IncludeQueryPredictions = true,
            }),
        };
        request.Headers.TryAddWithoutValidation("X-Goog-FieldMask", PlacesAutocompleteFieldMask);

        var httpResponse = await _httpClient.SendAsync(request);
        if (!httpResponse.IsSuccessStatusCode)
        {
            return new GooglePlacesAutocompleteResponse
            {
                Status = "REQUEST_DENIED",
                Predictions = [],
            };
        }

        var payload = await httpResponse.Content.ReadFromJsonAsync<PlacesAutocompleteResponse>(JsonOptions);
        var predictions = payload?.Suggestions?
            .Select(suggestion => suggestion.PlacePrediction)
            .Where(prediction => prediction is not null)
            .Select(prediction => new GooglePlacesPrediction
            {
                PlaceId = prediction!.PlaceId,
                Description = prediction.Text?.Text,
            })
            .Where(prediction =>
                !string.IsNullOrWhiteSpace(prediction.PlaceId)
                && !string.IsNullOrWhiteSpace(prediction.Description)
            )
            .Take(clampedLimit)
            .ToList()
            ?? [];

        return new GooglePlacesAutocompleteResponse
        {
            Status = "OK",
            Predictions = predictions,
        };
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

    private class PlacesAutocompleteRequest
    {
        [JsonPropertyName("input")]
        public string Input { get; set; } = string.Empty;

        [JsonPropertyName("includeQueryPredictions")]
        public bool IncludeQueryPredictions { get; set; }
    }

    private class PlacesAutocompleteResponse
    {
        [JsonPropertyName("suggestions")]
        public List<PlacesAutocompleteSuggestion>? Suggestions { get; set; }
    }

    private class PlacesAutocompleteSuggestion
    {
        [JsonPropertyName("placePrediction")]
        public PlacesPlacePrediction? PlacePrediction { get; set; }
    }

    private class PlacesPlacePrediction
    {
        [JsonPropertyName("placeId")]
        public string? PlaceId { get; set; }

        [JsonPropertyName("text")]
        public PlacesTextValue? Text { get; set; }
    }

    private class PlacesTextValue
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }

    private class PlaceDetailsResponse
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("displayName")]
        public PlacesTextValue? DisplayName { get; set; }

        [JsonPropertyName("formattedAddress")]
        public string? FormattedAddress { get; set; }

        [JsonPropertyName("location")]
        public PlacesLocation? Location { get; set; }
    }

    private class PlacesLocation
    {
        [JsonPropertyName("latitude")]
        public double Latitude { get; set; }

        [JsonPropertyName("longitude")]
        public double Longitude { get; set; }
    }
}
