using api.Externals.DTOs;

namespace api.Externals;

public interface IGoogleMapsClient
{
    Task<GoogleDistanceMatrixResponse?> GetDistanceMatrixAsync(
        string origins,
        string destinations,
        string travelMode,
        DateTimeOffset? departureTimeUtc
    );

    Task<GoogleGeocodeResponse?> ForwardGeocodeAsync(string address);
    Task<GoogleGeocodeResponse?> ForwardGeocodeByPlaceIdAsync(string placeId);
    Task<GooglePlacesAutocompleteResponse?> ForwardGeocodeAutocompleteAsync(string query, int limit);
    Task<GoogleDirectionsResponse?> GetDirectionsAsync(string origin, string destination, string travelMode);
}
