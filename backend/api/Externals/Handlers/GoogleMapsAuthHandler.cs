using System.Net.Http.Headers;
using api.Configuration;
using Google.Apis.Auth.OAuth2;

namespace api.Externals.Handlers;

public sealed class GoogleMapsAuthHandler(AppOptions appOptions) : DelegatingHandler
{
    private readonly AppOptions _appOptions = appOptions;
    private readonly SemaphoreSlim _credentialLock = new(1, 1);
    private GoogleCredential? _credential;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        var token = await GetAccessTokenAsync(cancellationToken);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var quotaProject = _appOptions.GoogleMaps?.QuotaProject?.Trim();
        if (!string.IsNullOrWhiteSpace(quotaProject))
        {
            request.Headers.Remove("X-Goog-User-Project");
            request.Headers.TryAddWithoutValidation("X-Goog-User-Project", quotaProject);
        }

        return await base.SendAsync(request, cancellationToken);
    }

    private async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        var credential = await GetCredentialAsync(cancellationToken);
        var token = await credential.UnderlyingCredential.GetAccessTokenForRequestAsync(cancellationToken: cancellationToken);
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException("Google service account access token is missing.");
        }

        return token;
    }

    private async Task<GoogleCredential> GetCredentialAsync(CancellationToken cancellationToken)
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

            var googleOptions = _appOptions.GoogleMaps;
            var configuredPath = googleOptions?.ServiceAccountJsonPath?.Trim();
            GoogleCredential credential;

            if (!string.IsNullOrWhiteSpace(configuredPath))
            {
                credential = GoogleCredential.FromFile(configuredPath);
            }
            else
            {
                credential = await GoogleCredential.GetApplicationDefaultAsync(cancellationToken);
            }

            var scopes = googleOptions?.ServiceAccountScopes ?? [];
            if (scopes.Length == 0)
            {
                scopes = ["https://www.googleapis.com/auth/cloud-platform"];
            }

            if (credential.IsCreateScopedRequired)
            {
                credential = credential.CreateScoped(scopes);
            }

            var quotaProject = googleOptions?.QuotaProject?.Trim();
            if (!string.IsNullOrWhiteSpace(quotaProject))
            {
                credential = credential.CreateWithQuotaProject(quotaProject);
            }

            _credential = credential;
            return _credential!;
        }
        catch (Exception ex) when (ex is InvalidOperationException or IOException or UnauthorizedAccessException)
        {
            throw new InvalidOperationException(
                "Failed to load Google service account credentials. Configure GoogleMaps:ServiceAccountJsonPath or GOOGLE_APPLICATION_CREDENTIALS.",
                ex
            );
        }
        finally
        {
            _credentialLock.Release();
        }
    }
}
