using System.Net.Http.Json;
using System.Text.Json;
using api.Configuration;
using api.Externals.DTOs;
using api.Models;

namespace api.Externals;

public class GooglePlacesClient(HttpClient httpClient, AppOptions appOptions) : IGooglePlacesClient
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
    private const string PlacesSearchTextFieldMask =
        "places.id,places.formattedAddress,places.location";
    private const double AutocompleteBiasRadiusMeters = 50_000;

    public async Task<GoogleGeocodeResponse?> ForwardGeocodeAsync(string address)
    {
        if (string.IsNullOrWhiteSpace(address))
        {
            return null;
        }

        using var request = CreatePlacesRequest(
            HttpMethod.Post,
            "places:searchText",
            PlacesSearchTextFieldMask,
            new PlacesSearchTextRequest
            {
                TextQuery = address.Trim(),
                MaxResultCount = 1,
            }
        );

        using var httpResponse = await _httpClient.SendAsync(request);
        var payload = await httpResponse.Content.ReadFromJsonAsync<PlacesSearchTextResponse>(JsonOptions);
        var place = payload?.Places?.FirstOrDefault();
        if (place?.Location == null)
        {
            return new GoogleGeocodeResponse
            {
                Status = "ZERO_RESULTS",
                Results = [],
            };
        }

        return new GoogleGeocodeResponse
        {
            Status = "OK",
            Results =
            [
                new GoogleGeocodeResult
                {
                    PlaceId = place.Id,
                    FormattedAddress = place.FormattedAddress ?? place.DisplayName?.Text,
                    Geometry = new GoogleGeocodeGeometry
                    {
                        Location = new GoogleGeocodeLocation
                        {
                            Latitude = place.Location.Latitude,
                            Longitude = place.Location.Longitude,
                        },
                    },
                },
            ],
        };
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

        return new GoogleGeocodeResponse
        {
            Status = "OK",
            Results =
            [
                new GoogleGeocodeResult
                {
                    PlaceId = payload.Id,
                    FormattedAddress = payload.FormattedAddress ?? payload.DisplayName?.Text,
                    Geometry = new GoogleGeocodeGeometry
                    {
                        Location = new GoogleGeocodeLocation
                        {
                            Latitude = payload.Location.Latitude,
                            Longitude = payload.Location.Longitude,
                        },
                    },
                },
            ],
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

        var request = new HttpRequestMessage(
            method,
            $"{EnsureTrailingSlash(placesApiBaseUrl)}{path}"
        );
        request.Headers.TryAddWithoutValidation("X-Goog-FieldMask", fieldMask);
        if (payload is not null)
        {
            request.Content = JsonContent.Create(payload);
        }

        return request;
    }

    private static string EnsureTrailingSlash(string value)
    {
        return value.EndsWith('/') ? value : $"{value}/";
    }
}
