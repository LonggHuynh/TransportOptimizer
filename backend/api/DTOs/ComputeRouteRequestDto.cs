namespace api.DTOs;

public class ComputeOrderRequestDto
{
    public CoordinateDto[] Places { get; init; } = Array.Empty<CoordinateDto>();
    public List<StopWindowDto> StopWindows { get; init; } = new();
    public DateTimeOffset? StartTimeUtc { get; init; }
    public string? TravelMode { get; init; }
}
