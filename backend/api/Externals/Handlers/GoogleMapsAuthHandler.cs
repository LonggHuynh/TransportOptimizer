using System.Net.Http.Headers;
using api.Configuration;
using Google.Apis.Auth.OAuth2;

namespace api.Externals.Handlers;

public sealed class GoogleMapsAuthHandler(AppOptions appOptions) : DelegatingHandler
{
    private readonly AppOptions _appOptions = appOptions;
    private readonly SemaphoreSlim _credentialLock = new(1, 1);
    private GoogleCredential? _credential;
    private const string DefaultScope = "https://www.googleapis.com/auth/cloud-platform";

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        var googleOptions = _appOptions.GoogleMaps;
        var token = await GetAccessTokenAsync(
            googleOptions?.ServiceAccountScopes,
            googleOptions?.QuotaProject,
            cancellationToken
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var quotaProject = googleOptions?.QuotaProject?.Trim();
        if (!string.IsNullOrWhiteSpace(quotaProject))
        {
            request.Headers.Remove("X-Goog-User-Project");
            request.Headers.TryAddWithoutValidation("X-Goog-User-Project", quotaProject);
        }

        return await base.SendAsync(request, cancellationToken);
    }

    private async Task<string> GetAccessTokenAsync(
        IEnumerable<string>? configuredScopes,
        string? quotaProject,
        CancellationToken cancellationToken
    )
    {
        var credential = await GetCredentialAsync(configuredScopes, quotaProject, cancellationToken);
        var token = await credential.UnderlyingCredential.GetAccessTokenForRequestAsync(cancellationToken: cancellationToken);
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException("Google access token is missing.");
        }

        return token;
    }

    private async Task<GoogleCredential> GetCredentialAsync(
        IEnumerable<string>? configuredScopes,
        string? quotaProject,
        CancellationToken cancellationToken
    )
    {
        if (_credential is not null)
        {
            return _credential;
        }

        await _credentialLock.WaitAsync(cancellationToken);
        try
        {
            if (_credential is not null)
            {
                return _credential;
            }

            var scopes = NormalizeScopes(configuredScopes);
            var credential = await GoogleCredential.GetApplicationDefaultAsync(cancellationToken);
            if (credential.IsCreateScopedRequired)
            {
                credential = credential.CreateScoped(scopes);
            }

            var normalizedQuotaProject = quotaProject?.Trim();
            if (!string.IsNullOrWhiteSpace(normalizedQuotaProject))
            {
                credential = credential.CreateWithQuotaProject(normalizedQuotaProject);
            }

            _credential = credential;
            return _credential;
        }
        catch (Exception ex) when (ex is InvalidOperationException or IOException or UnauthorizedAccessException)
        {
            throw new InvalidOperationException(
                "Failed to load Google credentials via ADC. Configure GOOGLE_APPLICATION_CREDENTIALS or workload identity.",
                ex
            );
        }
        finally
        {
            _credentialLock.Release();
        }
    }

    private static string[] NormalizeScopes(IEnumerable<string>? configuredScopes)
    {
        var scopes = configuredScopes?
            .Select(scope => scope?.Trim())
            .Where(scope => !string.IsNullOrWhiteSpace(scope))
            .Select(scope => scope!)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        return scopes is { Length: > 0 } ? scopes : [DefaultScope];
    }
}
