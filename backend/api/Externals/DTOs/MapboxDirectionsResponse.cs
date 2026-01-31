using System.Text.Json.Serialization;

namespace api.Externals.DTOs
{
    public class MapboxDirectionsResponse
    {
        [JsonPropertyName("routes")]
        public List<MapboxRoute>? Routes { get; set; }
    }

    public class MapboxRoute
    {
        [JsonPropertyName("distance")]
        public double Distance { get; set; }

        [JsonPropertyName("duration")]
        public double Duration { get; set; }

        [JsonPropertyName("geometry")]
        public MapboxGeometry? Geometry { get; set; }
    }

    public class MapboxGeometry
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("coordinates")]
        public double[][]? Coordinates { get; set; }
    }
}
