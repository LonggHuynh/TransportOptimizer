using System.Text.Json.Serialization;

namespace api.Externals.DTOs;

public class GoogleMapTilesCreateSessionRequest
{
    [JsonPropertyName("mapType")]
    public string MapType { get; set; } = "roadmap";

    [JsonPropertyName("language")]
    public string Language { get; set; } = "en-US";

    [JsonPropertyName("region")]
    public string Region { get; set; } = "US";

    [JsonPropertyName("imageFormat")]
    public string ImageFormat { get; set; } = "png";

    [JsonPropertyName("layerTypes")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? LayerTypes { get; set; }

    [JsonPropertyName("overlay")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Overlay { get; set; }
}

public class GoogleMapTilesCreateSessionResponse
{
    [JsonPropertyName("session")]
    public string? Session { get; set; }

    [JsonPropertyName("expiry")]
    public string? Expiry { get; set; }

    [JsonPropertyName("tileWidth")]
    public int? TileWidth { get; set; }

    [JsonPropertyName("tileHeight")]
    public int? TileHeight { get; set; }

    [JsonPropertyName("imageFormat")]
    public string? ImageFormat { get; set; }
}
