using System.Collections.Concurrent;
using Google.Apis.Auth.OAuth2;

namespace api.Services;

public interface IGoogleCredentialFactory
{
    GoogleCredential GetCredential(IEnumerable<string>? scopes);
}

public sealed class GoogleCredentialFactory(GoogleCredential baseCredential) : IGoogleCredentialFactory
{
    private const string DefaultScope = "https://www.googleapis.com/auth/cloud-platform";

    private readonly GoogleCredential _baseCredential = baseCredential;
    private readonly ConcurrentDictionary<string, GoogleCredential> _cache = new(StringComparer.Ordinal);

    public GoogleCredential GetCredential(IEnumerable<string>? scopes)
    {
        var normalizedScopes = NormalizeScopes(scopes);
        var cacheKey = BuildCacheKey(normalizedScopes);
        return _cache.GetOrAdd(cacheKey, _ => CreateCredential(normalizedScopes));
    }

    private GoogleCredential CreateCredential(string[] scopes)
    {
        return _baseCredential.CreateScoped(scopes);
    }

    private static string[] NormalizeScopes(IEnumerable<string>? scopes)
    {
        var normalizedScopes = scopes?
            .Select(scope => scope?.Trim())
            .Where(scope => !string.IsNullOrWhiteSpace(scope))
            .Select(scope => scope!)
            .Distinct(StringComparer.Ordinal)
            .OrderBy(scope => scope, StringComparer.Ordinal)
            .ToArray();

        return normalizedScopes is { Length: > 0 } ? normalizedScopes : [DefaultScope];
    }

    private static string BuildCacheKey(IEnumerable<string> scopes)
    {
        return string.Join(" ", scopes);
    }
}
