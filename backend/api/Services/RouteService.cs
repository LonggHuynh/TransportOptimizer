using api.Models;

namespace api.Services;

public class RouteService : IRouteService
{
    public List<Coordinate[]> BuildBestRoutes(List<int> order, Coordinate[] places)
    {
        var routes = new List<Coordinate[]>();
        for (var i = 0; i < order.Count - 1; i++)
        {
            var fromIndex = order[i];
            var toIndex = order[i + 1];
            if (fromIndex < 0 || fromIndex >= places.Length || toIndex < 0 || toIndex >= places.Length)
            {
                continue;
            }
            routes.Add([places[fromIndex], places[toIndex]]);
        }

        return routes;
    }
}
