namespace api.Models;

public class RouteJobPayload
{
    public int[][] DistanceMatrix { get; init; } = Array.Empty<int[]>();
    public List<Requirement> Requirements { get; init; } = new();
}
