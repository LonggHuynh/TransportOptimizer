namespace api.Models;

public class GeocodeSuggestion
{
    public string Label { get; init; } = string.Empty;
    public double Latitude { get; init; }
    public double Longitude { get; init; }
}

