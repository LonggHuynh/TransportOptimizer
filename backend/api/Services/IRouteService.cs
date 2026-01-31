using api.Models;

namespace api.Services;

public interface IRouteService
{
    List<string[]> BuildBestRoutes(List<int> order, string[] places);
}
