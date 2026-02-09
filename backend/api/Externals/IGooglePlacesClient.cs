using api.Externals.DTOs;
using api.Models;

namespace api.Externals;

public interface IGooglePlacesClient
{
    Task<GoogleGeocodeResponse?> ForwardGeocodeAsync(string address);
    Task<GoogleGeocodeResponse?> ForwardGeocodeByPlaceIdAsync(string placeId);
    Task<GooglePlacesAutocompleteResponse?> ForwardGeocodeAutocompleteAsync(string query, GeoCode? biasCenter = null);
}
