using System.Net.Http.Json;
using System.Text.Json;
using api.Externals.DTOs;

namespace api.Externals;

public class GooglePlacesClient(HttpClient httpClient) : IGooglePlacesClient
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
    private const string PlacesSearchTextFieldMask =
        "places.id,places.formattedAddress,places.location";

    public async Task<PlacesSearchTextResponse?> SearchTextAsync(PlacesSearchTextRequest requestDto)
    {
        using var request = CreateRequest(
            HttpMethod.Post,
            "places:searchText",
            PlacesSearchTextFieldMask,
            requestDto
        );

        using var response = await _httpClient.SendAsync(request);
        return await response.Content.ReadFromJsonAsync<PlacesSearchTextResponse>(JsonOptions);
    }

    public async Task<PlaceDetailsResponse?> GetPlaceDetailsAsync(string placeId)
    {
        if (string.IsNullOrWhiteSpace(placeId))
        {
            return null;
        }

        var normalizedPlaceId = placeId.StartsWith("places/", StringComparison.OrdinalIgnoreCase)
            ? placeId["places/".Length..]
            : placeId;

        using var request = CreateRequest(
            HttpMethod.Get,
            $"places/{Uri.EscapeDataString(normalizedPlaceId)}",
            PlaceDetailsFieldMask
        );

        using var response = await _httpClient.SendAsync(request);
        return await response.Content.ReadFromJsonAsync<PlaceDetailsResponse>(JsonOptions);
    }

    public async Task<PlacesAutocompleteResponse?> AutocompleteAsync(PlacesAutocompleteRequest requestDto)
    {
        using var request = CreateRequest(
            HttpMethod.Post,
            "places:autocomplete",
            PlacesAutocompleteFieldMask,
            requestDto
        );

        using var response = await _httpClient.SendAsync(request);
        return await response.Content.ReadFromJsonAsync<PlacesAutocompleteResponse>(JsonOptions);
    }

    private static HttpRequestMessage CreateRequest(
        HttpMethod method,
        string path,
        string fieldMask,
        object? payload = null
    )
    {
        var request = new HttpRequestMessage(method, new Uri(path, UriKind.Relative));
        request.Headers.TryAddWithoutValidation("X-Goog-FieldMask", fieldMask);
        if (payload is not null)
        {
            request.Content = JsonContent.Create(payload);
        }

        return request;
    }
}
