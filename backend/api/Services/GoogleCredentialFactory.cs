using System.Collections.Concurrent;
using Google.Apis.Auth.OAuth2;

namespace api.Services;

public interface IGoogleCredentialFactory
{
    GoogleCredential GetCredential(IEnumerable<string>? scopes, string? quotaProject = null);
}

public sealed class GoogleCredentialFactory(GoogleCredential baseCredential) : IGoogleCredentialFactory
{
    private const string DefaultScope = "https://www.googleapis.com/auth/cloud-platform";

    private readonly GoogleCredential _baseCredential = baseCredential;
    private readonly ConcurrentDictionary<string, GoogleCredential> _cache = new(StringComparer.Ordinal);

    public GoogleCredential GetCredential(IEnumerable<string>? scopes, string? quotaProject = null)
    {
        var normalizedScopes = NormalizeScopes(scopes);
        var normalizedQuotaProject = NormalizeQuotaProject(quotaProject);
        var cacheKey = BuildCacheKey(normalizedScopes, normalizedQuotaProject);
        return _cache.GetOrAdd(cacheKey, _ => CreateCredential(normalizedScopes, normalizedQuotaProject));
    }

    private GoogleCredential CreateCredential(string[] scopes, string? quotaProject)
    {
        var credential = _baseCredential.CreateScoped(scopes);
        if (!string.IsNullOrWhiteSpace(quotaProject))
        {
            credential = credential.CreateWithQuotaProject(quotaProject);
        }

        return credential;
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

    private static string? NormalizeQuotaProject(string? quotaProject)
    {
        var normalized = quotaProject?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private static string BuildCacheKey(IEnumerable<string> scopes, string? quotaProject)
    {
        var scopeKey = string.Join(" ", scopes);
        var quotaKey = quotaProject ?? "<none>";
        return $"{quotaKey}|{scopeKey}";
    }
}
