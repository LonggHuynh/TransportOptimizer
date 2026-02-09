namespace api.Externals;

public record GoogleMapsTile(byte[] Data, string ContentType);

public interface IGoogleMapsClient
{
    Task<GoogleMapsTile?> GetTileAsync(int tileSize, int z, int x, int y, string mapType);
}
