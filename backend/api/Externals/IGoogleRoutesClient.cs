using api.Externals.DTOs;

namespace api.Externals;

public interface IGoogleRoutesClient
{
    Task<GoogleDistanceMatrixResponse?> GetDistanceMatrixAsync(
        string origins,
        string destinations,
        string travelMode,
        DateTimeOffset? departureTimeUtc
    );

    Task<GoogleDirectionsResponse?> GetDirectionsAsync(string origin, string destination, string travelMode);
}
