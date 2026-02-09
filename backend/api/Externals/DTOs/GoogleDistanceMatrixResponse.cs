using System.Text.Json.Serialization;

namespace api.Externals.DTOs;

public class GoogleDistanceMatrixResponse
{
    public string? Status { get; set; }
    [JsonPropertyName("error_message")]
    public string? ErrorMessage { get; set; }
    public List<GoogleDistanceMatrixRow>? Rows { get; set; }
}

public class GoogleDistanceMatrixRow
{
    public List<GoogleDistanceMatrixElement>? Elements { get; set; }
}

public class GoogleDistanceMatrixElement
{
    public string? Status { get; set; }
    public GoogleDurationValue? Duration { get; set; }
    [JsonPropertyName("duration_in_traffic")]
    public GoogleDurationValue? DurationInTraffic { get; set; }
}

public class GoogleDurationValue
{
    public int? Value { get; set; }
}
