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
}
