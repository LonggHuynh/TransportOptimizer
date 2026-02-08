using System.Text.Json.Serialization;

namespace api.Externals.DTOs
{
    public class MapboxGeocodeResponse
    {
        [JsonPropertyName("features")]
        public List<MapboxGeocodeFeature>? Features { get; set; }
    }

    public class MapboxGeocodeFeature
    {
        [JsonPropertyName("center")]
        public double[]? Center { get; set; }

        [JsonPropertyName("place_name")]
        public string? PlaceName { get; set; }

        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }
}
