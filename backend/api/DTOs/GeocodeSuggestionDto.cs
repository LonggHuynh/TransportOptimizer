namespace api.DTOs;

public class GeocodeSuggestionDto
{
    public string Label { get; init; } = string.Empty;
    public string? PlaceId { get; init; }
}
