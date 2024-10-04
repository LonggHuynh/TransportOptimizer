using api.Models;

namespace api.Services;

public interface IRouteService
{
    RouteResult ComputeRoute(int[][] dist, List<Requirement> requirements);
}