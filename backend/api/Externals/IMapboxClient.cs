using api.Externals.DTOs;

namespace api.Externals
{
    public interface IMapboxClient
    {
        Task<MapboxGeocodeResponse?> ForwardGeocodeAsync(string address);
        Task<MapboxMatrixResponse?> GetMatrixAsync(string profile, string coordinates);
        Task<MapboxDirectionsResponse?> GetDirectionsAsync(string profile, string coordinates);
        Task<MapboxTile?> GetTileAsync(string styleId, int tileSize, int z, int x, int y);
    }
}
