using System.Text.Json.Serialization;

namespace api.Externals.DTOs;

public class PlacesAutocompleteRequest
{
    [JsonPropertyName("input")]
    public string Input { get; set; } = string.Empty;

    [JsonPropertyName("includeQueryPredictions")]
    public bool IncludeQueryPredictions { get; set; }

    [JsonPropertyName("locationBias")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public PlacesLocationBias? LocationBias { get; set; }
}

public class PlacesSearchTextRequest
{
    [JsonPropertyName("textQuery")]
    public string TextQuery { get; set; } = string.Empty;

    [JsonPropertyName("maxResultCount")]
    public int MaxResultCount { get; set; }
}

public class PlacesLocationBias
{
    [JsonPropertyName("circle")]
    public PlacesLocationBiasCircle? Circle { get; set; }
}

public class PlacesLocationBiasCircle
{
    [JsonPropertyName("center")]
    public PlacesCenterPoint? Center { get; set; }

    [JsonPropertyName("radius")]
    public double Radius { get; set; }
}

public class PlacesCenterPoint
{
    [JsonPropertyName("latitude")]
    public double Latitude { get; set; }

    [JsonPropertyName("longitude")]
    public double Longitude { get; set; }
}

public class PlacesAutocompleteResponse
{
    [JsonPropertyName("suggestions")]
    public List<PlacesAutocompleteSuggestion>? Suggestions { get; set; }
}

public class PlacesAutocompleteSuggestion
{
    [JsonPropertyName("placePrediction")]
    public PlacesPlacePrediction? PlacePrediction { get; set; }
}

public class PlacesPlacePrediction
{
    [JsonPropertyName("placeId")]
    public string? PlaceId { get; set; }

    [JsonPropertyName("text")]
    public PlacesTextValue? Text { get; set; }
}

public class PlacesTextValue
{
    [JsonPropertyName("text")]
    public string? Text { get; set; }
}

public class PlacesSearchTextResponse
{
    [JsonPropertyName("places")]
    public List<PlaceDetailsResponse>? Places { get; set; }
}

public class PlaceDetailsResponse
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("displayName")]
    public PlacesTextValue? DisplayName { get; set; }

    [JsonPropertyName("formattedAddress")]
    public string? FormattedAddress { get; set; }

    [JsonPropertyName("location")]
    public PlacesLocation? Location { get; set; }
}

public class PlacesLocation
{
    [JsonPropertyName("latitude")]
    public double Latitude { get; set; }

    [JsonPropertyName("longitude")]
    public double Longitude { get; set; }
}
