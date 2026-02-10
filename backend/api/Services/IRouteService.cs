using api.Models;

namespace api.Services;

public interface IRouteService
{
    List<Coordinate[]> BuildBestRoutes(List<int> order, Coordinate[] places);
}
