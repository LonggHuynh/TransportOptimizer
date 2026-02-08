namespace api.Models;

public class StopWindow
{
    public int StopIndex { get; init; }
    public int WindowStartMinutes { get; init; }
    public int WindowEndMinutes { get; init; }
    public int ServiceMinutes { get; init; }
}
