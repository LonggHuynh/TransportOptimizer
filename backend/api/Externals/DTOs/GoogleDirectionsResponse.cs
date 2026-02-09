using System.Text.Json.Serialization;

namespace api.Externals.DTOs;

public class GoogleDirectionsResponse
{
    public string? Status { get; set; }
    public List<GoogleDirectionsRoute>? Routes { get; set; }
}

public class GoogleDirectionsRoute
{
    [JsonPropertyName("overview_polyline")]
    public GoogleOverviewPolyline? OverviewPolyline { get; set; }

    public List<GoogleDirectionsLeg>? Legs { get; set; }
}

public class GoogleOverviewPolyline
{
    public string? Points { get; set; }
}

public class GoogleDirectionsLeg
{
    public GoogleDurationValue? Duration { get; set; }
    public GoogleDirectionsDistance? Distance { get; set; }
}

public class GoogleDirectionsDistance
{
    public int? Value { get; set; }
}
