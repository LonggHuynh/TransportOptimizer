namespace api.DTOs;

public class ComputeOrderRequestDto
{
    public string[] Places { get; init; } = Array.Empty<string>();
    public List<StopWindowDto> StopWindows { get; init; } = new();
}
