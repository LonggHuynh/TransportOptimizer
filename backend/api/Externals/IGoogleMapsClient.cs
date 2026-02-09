using api.Externals.DTOs;
using api.Models;

namespace api.Externals;

public record GoogleMapsTile(byte[] Data, string ContentType);

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
    Task<GooglePlacesAutocompleteResponse?> ForwardGeocodeAutocompleteAsync(string query, int limit, GeoCode? biasCenter = null);
    Task<GoogleDirectionsResponse?> GetDirectionsAsync(string origin, string destination, string travelMode);
    Task<GoogleMapsTile?> GetTileAsync(int tileSize, int z, int x, int y, string mapType);
}
