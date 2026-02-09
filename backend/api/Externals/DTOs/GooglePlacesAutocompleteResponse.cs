using System.Text.Json.Serialization;

namespace api.Externals.DTOs;

public class GooglePlacesAutocompleteResponse
{
    public string? Status { get; set; }
    public List<GooglePlacesPrediction>? Predictions { get; set; }
}

public class GooglePlacesPrediction
{
    public string? Description { get; set; }

    [JsonPropertyName("place_id")]
    public string? PlaceId { get; set; }
}
