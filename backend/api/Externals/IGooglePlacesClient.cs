using api.Externals.DTOs;

namespace api.Externals;

public interface IGooglePlacesClient
{
    Task<PlacesSearchTextResponse?> SearchTextAsync(PlacesSearchTextRequest request);
    Task<PlaceDetailsResponse?> GetPlaceDetailsAsync(string placeId);
    Task<PlacesAutocompleteResponse?> AutocompleteAsync(PlacesAutocompleteRequest request);
}
