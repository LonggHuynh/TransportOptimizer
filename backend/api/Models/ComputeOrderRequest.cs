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

    public string[] Places { get; init; } = Array.Empty<string>();
    public List<Requirement> Requirements { get; init; } = new();

    public string ComputeJobId()
    {
        var payload = new
        {
            places = Places ?? Array.Empty<string>(),
            requirements = Requirements ?? new List<Requirement>(),
        };
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        using var sha = SHA256.Create();
        var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(json));
        Span<byte> guidBytes = stackalloc byte[16];
        hash.AsSpan(0, 16).CopyTo(guidBytes);
        return new Guid(guidBytes).ToString("N");
    }
}
