using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace api.Models;

public class ComputeOrderRequest
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public Coordinate[] Places { get; init; } = Array.Empty<Coordinate>();
    public List<StopWindow> StopWindows { get; init; } = new();
    public DateTimeOffset? StartTimeUtc { get; init; }
    public string? TravelMode { get; init; }

    public string ComputeJobId()
    {
        var payload = new
        {
            places = Places ?? Array.Empty<Coordinate>(),
            stopWindows = StopWindows ?? new List<StopWindow>(),
            startTimeUtc = StartTimeUtc,
            travelMode = TravelMode,
        };
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        using var sha = SHA256.Create();
        var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(json));
        Span<byte> guidBytes = stackalloc byte[16];
        hash.AsSpan(0, 16).CopyTo(guidBytes);
        return new Guid(guidBytes).ToString("N");
    }
}
