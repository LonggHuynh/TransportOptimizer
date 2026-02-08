namespace api.DTOs;

public class StopWindowDto
{
    public int StopIndex { get; init; }
    public int WindowStartMinutes { get; init; }
    public int WindowEndMinutes { get; init; }
    public int ServiceMinutes { get; init; }
}
