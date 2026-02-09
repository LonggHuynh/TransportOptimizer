using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using api.Configuration;
using api.Externals.DTOs;
using api.Models;

namespace api.Externals;

public class GoogleMapsClient(HttpClient httpClient, AppOptions appOptions) : IGoogleMapsClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _httpClient = httpClient;
    private readonly AppOptions _appOptions = appOptions;

    private const string PlacesAutocompleteFieldMask =
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text";
    private const string PlaceDetailsFieldMask =
        "id,displayName.text,formattedAddress,location";
    private const double AutocompleteBiasRadiusMeters = 50_000;

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

        using var request = CreatePlacesRequest(
            HttpMethod.Get,
            $"places/{Uri.EscapeDataString(normalizedPlaceId)}",
            PlaceDetailsFieldMask
        );

        using var httpResponse = await _httpClient.SendAsync(request);
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
        GeoCode? biasCenter = null
    )
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return null;
        }

        PlacesLocationBias? locationBias = null;
        if (biasCenter?.Latitude is double latitude && biasCenter.Longitude is double longitude)
        {
            locationBias = new PlacesLocationBias
            {
                Circle = new PlacesLocationBiasCircle
                {
                    Center = new PlacesCenterPoint
                    {
                        Latitude = latitude,
                        Longitude = longitude,
                    },
                    Radius = AutocompleteBiasRadiusMeters,
                },
            };
        }

        using var request = CreatePlacesRequest(
            HttpMethod.Post,
            "places:autocomplete",
            PlacesAutocompleteFieldMask,
            new PlacesAutocompleteRequest
            {
                Input = query,
                IncludeQueryPredictions = true,
                LocationBias = locationBias,
            }
        );

        using var httpResponse = await _httpClient.SendAsync(request);

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
        var url =
            $"directions/json?origin={Uri.EscapeDataString(origin)}&destination={Uri.EscapeDataString(destination)}&mode={Uri.EscapeDataString(mode)}";
        return await _httpClient.GetFromJsonAsync<GoogleDirectionsResponse>(url, JsonOptions);
    }

    public async Task<GoogleMapsTile?> GetTileAsync(int tileSize, int z, int x, int y, string mapType)
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
        return new GoogleMapsTile(data, contentType);
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
            latitude.ToString(System.Globalization.CultureInfo.InvariantCulture),
            longitude.ToString(System.Globalization.CultureInfo.InvariantCulture)
        );
    }

    private HttpRequestMessage CreatePlacesRequest(
        HttpMethod method,
        string path,
        string fieldMask,
        object? payload = null
    )
    {
        var placesApiBaseUrl = _appOptions.GoogleMaps?.PlacesApiUrl;
        if (string.IsNullOrWhiteSpace(placesApiBaseUrl))
        {
            placesApiBaseUrl = "https://places.googleapis.com/v1";
        }

        var normalizedPlacesApiBaseUrl = placesApiBaseUrl.EndsWith('/')
            ? placesApiBaseUrl
            : $"{placesApiBaseUrl}/";
        var request = new HttpRequestMessage(method, $"{normalizedPlacesApiBaseUrl}{path}");
        request.Headers.TryAddWithoutValidation("X-Goog-FieldMask", fieldMask);
        if (payload is not null)
        {
            request.Content = JsonContent.Create(payload);
        }

        return request;
    }

    private class PlacesAutocompleteRequest
    {
        [JsonPropertyName("input")]
        public string Input { get; set; } = string.Empty;

        [JsonPropertyName("includeQueryPredictions")]
        public bool IncludeQueryPredictions { get; set; }

        [JsonPropertyName("locationBias")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public PlacesLocationBias? LocationBias { get; set; }
    }

    private class PlacesLocationBias
    {
        [JsonPropertyName("circle")]
        public PlacesLocationBiasCircle? Circle { get; set; }
    }

    private class PlacesLocationBiasCircle
    {
        [JsonPropertyName("center")]
        public PlacesCenterPoint? Center { get; set; }

        [JsonPropertyName("radius")]
        public double Radius { get; set; }
    }

    private class PlacesCenterPoint
    {
        [JsonPropertyName("latitude")]
        public double Latitude { get; set; }

        [JsonPropertyName("longitude")]
        public double Longitude { get; set; }
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
