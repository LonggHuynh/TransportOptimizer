namespace api.Models;

public class GeocodeSuggestion
{
    public string Label { get; init; } = string.Empty;
    public string? PlaceId { get; init; }
}
