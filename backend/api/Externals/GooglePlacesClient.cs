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
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            new Uri("./places:searchText", UriKind.Relative)
        )
        {
            Content = JsonContent.Create(requestDto),
        };
        request.Headers.TryAddWithoutValidation("X-Goog-FieldMask", PlacesSearchTextFieldMask);

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

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            new Uri($"./places/{Uri.EscapeDataString(normalizedPlaceId)}", UriKind.Relative)
        );
        request.Headers.TryAddWithoutValidation("X-Goog-FieldMask", PlaceDetailsFieldMask);

        using var response = await _httpClient.SendAsync(request);
        return await response.Content.ReadFromJsonAsync<PlaceDetailsResponse>(JsonOptions);
    }

    public async Task<PlacesAutocompleteResponse?> AutocompleteAsync(PlacesAutocompleteRequest requestDto)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            new Uri("./places:autocomplete", UriKind.Relative)
        )
        {
            Content = JsonContent.Create(requestDto),
        };
        request.Headers.TryAddWithoutValidation("X-Goog-FieldMask", PlacesAutocompleteFieldMask);

        using var response = await _httpClient.SendAsync(request);
        return await response.Content.ReadFromJsonAsync<PlacesAutocompleteResponse>(JsonOptions);
    }
}
