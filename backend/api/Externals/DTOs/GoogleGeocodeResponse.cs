using System.Text.Json.Serialization;

namespace api.Externals.DTOs;

public class GoogleGeocodeResponse
{
    public string? Status { get; set; }
    public List<GoogleGeocodeResult>? Results { get; set; }
}

public class GoogleGeocodeResult
{
    [JsonPropertyName("formatted_address")]
    public string? FormattedAddress { get; set; }

    [JsonPropertyName("place_id")]
    public string? PlaceId { get; set; }

    public GoogleGeocodeGeometry? Geometry { get; set; }
}

public class GoogleGeocodeGeometry
{
    public GoogleGeocodeLocation? Location { get; set; }
}

public class GoogleGeocodeLocation
{
    [JsonPropertyName("lat")]
    public double Latitude { get; set; }

    [JsonPropertyName("lng")]
    public double Longitude { get; set; }
}
