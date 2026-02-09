using System.Text.Json.Serialization;

namespace api.Externals.DTOs;

public class RoutesComputeRoutesRequest
{
    [JsonPropertyName("origin")]
    public RoutesWaypoint? Origin { get; set; }

    [JsonPropertyName("destination")]
    public RoutesWaypoint? Destination { get; set; }

    [JsonPropertyName("travelMode")]
    public string TravelMode { get; set; } = "DRIVE";

    [JsonPropertyName("routingPreference")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? RoutingPreference { get; set; }
}

public class RoutesComputeRoutesResponse
{
    [JsonPropertyName("routes")]
    public List<RoutesComputeRoute>? Routes { get; set; }
}

public class RoutesComputeRoute
{
    [JsonPropertyName("duration")]
    public string? Duration { get; set; }

    [JsonPropertyName("distanceMeters")]
    public int? DistanceMeters { get; set; }

    [JsonPropertyName("polyline")]
    public RoutesPolyline? Polyline { get; set; }
}

public class RoutesPolyline
{
    [JsonPropertyName("encodedPolyline")]
    public string? EncodedPolyline { get; set; }
}

public class RoutesComputeRouteMatrixRequest
{
    [JsonPropertyName("origins")]
    public List<RoutesMatrixOrigin> Origins { get; set; } = [];

    [JsonPropertyName("destinations")]
    public List<RoutesMatrixDestination> Destinations { get; set; } = [];

    [JsonPropertyName("travelMode")]
    public string TravelMode { get; set; } = "DRIVE";

    [JsonPropertyName("routingPreference")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? RoutingPreference { get; set; }

    [JsonPropertyName("departureTime")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DepartureTime { get; set; }
}

public class RoutesMatrixOrigin
{
    [JsonPropertyName("waypoint")]
    public RoutesWaypoint? Waypoint { get; set; }
}

public class RoutesMatrixDestination
{
    [JsonPropertyName("waypoint")]
    public RoutesWaypoint? Waypoint { get; set; }
}

public class RoutesWaypoint
{
    [JsonPropertyName("location")]
    public RoutesLocation? Location { get; set; }
}

public class RoutesLocation
{
    [JsonPropertyName("latLng")]
    public RoutesLatLng? LatLng { get; set; }
}

public class RoutesLatLng
{
    [JsonPropertyName("latitude")]
    public double Latitude { get; set; }

    [JsonPropertyName("longitude")]
    public double Longitude { get; set; }
}

public class RoutesComputeRouteMatrixElement
{
    [JsonPropertyName("originIndex")]
    public int? OriginIndex { get; set; }

    [JsonPropertyName("destinationIndex")]
    public int? DestinationIndex { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("condition")]
    public string? Condition { get; set; }

    [JsonPropertyName("duration")]
    public string? Duration { get; set; }

    [JsonPropertyName("staticDuration")]
    public string? StaticDuration { get; set; }
}
