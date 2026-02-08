namespace api.DTOs;

public class GeocodeSuggestionDto
{
    public string Label { get; init; } = string.Empty;
    public double Latitude { get; init; }
    public double Longitude { get; init; }
}

