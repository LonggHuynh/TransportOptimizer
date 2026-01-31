namespace api.Services
{
    public interface ITileService
    {
        Task<TileServiceResult> GetTileAsync(int z, int x, int y, string? ifNoneMatch);
    }

    public record TileServiceResult(
        int StatusCode,
        byte[]? Data,
        string? ContentType,
        string? ETag,
        string? CacheControl,
        string? Error);
}
