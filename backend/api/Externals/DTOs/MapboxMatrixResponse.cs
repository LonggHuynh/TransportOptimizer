using System.Text.Json.Serialization;

namespace api.Externals.DTOs
{
    public class MapboxMatrixResponse
    {
        [JsonPropertyName("durations")]
        public double?[][]? Durations { get; set; }
    }
}
