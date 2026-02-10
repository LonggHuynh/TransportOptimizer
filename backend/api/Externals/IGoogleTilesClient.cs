namespace api.Externals;

public record GoogleTile(byte[] Data, string ContentType);

public interface IGoogleTilesClient
{
    Task<GoogleTile?> GetTileAsync(int tileSize, int z, int x, int y, string mapType);
}
