using api.Models;

namespace api.DTOs;

public class RouteResultDto
{
    public List<int>? Order { get; init; }
    public int? TotalTime { get; init; }
    public List<Coordinate[]>? BestRoutes { get; set; }
}
