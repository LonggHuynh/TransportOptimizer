namespace api.DTOs;

public class RouteResultDto
{
    public List<int>? Order { get; init; }
    public int? TotalTime { get; init; }
    public List<string[]>? BestRoutes { get; set; }
}
