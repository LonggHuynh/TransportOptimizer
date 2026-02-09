using Google.Apis.Auth.OAuth2;

namespace api.Services;

public interface IGoogleAccessTokenProvider
{
    Task<string> GetAccessTokenAsync(
        IEnumerable<string>? scopes,
        string? serviceAccountJsonPath = null,
        string? quotaProject = null,
        CancellationToken cancellationToken = default
    );
}

public sealed class GoogleAccessTokenProvider : IGoogleAccessTokenProvider
{
    private const string DefaultScope = "https://www.googleapis.com/auth/cloud-platform";

    private readonly SemaphoreSlim _credentialLock = new(1, 1);
    private readonly Dictionary<string, GoogleCredential> _credentialCache = new(StringComparer.Ordinal);

    public async Task<string> GetAccessTokenAsync(
        IEnumerable<string>? scopes,
        string? serviceAccountJsonPath = null,
        string? quotaProject = null,
        CancellationToken cancellationToken = default
    )
    {
        var normalizedScopes = NormalizeScopes(scopes);
        var normalizedPath = NormalizeString(serviceAccountJsonPath);
        var normalizedQuotaProject = NormalizeString(quotaProject);
        var credential = await GetOrCreateCredentialAsync(
            normalizedScopes,
            normalizedPath,
            normalizedQuotaProject,
            cancellationToken
        );

        var token = await credential.UnderlyingCredential.GetAccessTokenForRequestAsync(
            cancellationToken: cancellationToken
        );
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException("Google access token is missing.");
        }

        return token;
    }

    private async Task<GoogleCredential> GetOrCreateCredentialAsync(
        string[] scopes,
        string? serviceAccountJsonPath,
        string? quotaProject,
        CancellationToken cancellationToken
    )
    {
        var cacheKey = BuildCacheKey(scopes, serviceAccountJsonPath, quotaProject);
        if (_credentialCache.TryGetValue(cacheKey, out var cachedCredential))
        {
            return cachedCredential;
        }

        await _credentialLock.WaitAsync(cancellationToken);
        try
        {
            if (_credentialCache.TryGetValue(cacheKey, out cachedCredential))
            {
                return cachedCredential;
            }

            var credential = await LoadCredentialAsync(scopes, serviceAccountJsonPath, quotaProject, cancellationToken);
            _credentialCache[cacheKey] = credential;
            return credential;
        }
        finally
        {
            _credentialLock.Release();
        }
    }

    private static async Task<GoogleCredential> LoadCredentialAsync(
        IEnumerable<string> scopes,
        string? serviceAccountJsonPath,
        string? quotaProject,
        CancellationToken cancellationToken
    )
    {
        try
        {
            GoogleCredential credential;
            if (!string.IsNullOrWhiteSpace(serviceAccountJsonPath))
            {
                credential = GoogleCredential.FromFile(serviceAccountJsonPath);
            }
            else
            {
                credential = await GoogleCredential.GetApplicationDefaultAsync(cancellationToken);
            }

            if (credential.IsCreateScopedRequired)
            {
                credential = credential.CreateScoped(scopes);
            }

            if (!string.IsNullOrWhiteSpace(quotaProject))
            {
                credential = credential.CreateWithQuotaProject(quotaProject);
            }

            return credential;
        }
        catch (Exception ex) when (ex is InvalidOperationException or IOException or UnauthorizedAccessException)
        {
            throw new InvalidOperationException(
                "Failed to load Google credentials. Configure service-account JSON path or GOOGLE_APPLICATION_CREDENTIALS.",
                ex
            );
        }
    }

    private static string[] NormalizeScopes(IEnumerable<string>? scopes)
    {
        var normalized = scopes?
            .Select(scope => scope?.Trim())
            .Where(scope => !string.IsNullOrWhiteSpace(scope))
            .Select(scope => scope!)
            .Distinct(StringComparer.Ordinal)
            .OrderBy(scope => scope, StringComparer.Ordinal)
            .ToArray();

        return normalized is { Length: > 0 } ? normalized : [DefaultScope];
    }

    private static string? NormalizeString(string? value)
    {
        var normalized = value?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private static string BuildCacheKey(IEnumerable<string> scopes, string? serviceAccountJsonPath, string? quotaProject)
    {
        var scopeKey = string.Join(" ", scopes);
        var pathKey = serviceAccountJsonPath ?? "<adc>";
        var quotaKey = quotaProject ?? "<none>";
        return $"{pathKey}|{quotaKey}|{scopeKey}";
    }
}
