using System.Net.Http.Headers;
using api.Configuration;
using Google.Apis.Auth.OAuth2;

namespace api.Externals.Handlers;

public sealed class GoogleMapsAuthHandler(AppOptions appOptions) : DelegatingHandler
{
    private readonly AppOptions _appOptions = appOptions;
    private const string DefaultScope = "https://www.googleapis.com/auth/cloud-platform";

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        var googleOptions = _appOptions.GoogleMaps;
        var scopes = NormalizeScopes(googleOptions?.ServiceAccountScopes);
        try
        {
            var credential = await GoogleCredential.GetApplicationDefaultAsync(cancellationToken);
            if (credential.IsCreateScopedRequired)
            {
                credential = credential.CreateScoped(scopes);
            }

            var quotaProject = googleOptions?.QuotaProject?.Trim();
            if (!string.IsNullOrWhiteSpace(quotaProject))
            {
                credential = credential.CreateWithQuotaProject(quotaProject);
                request.Headers.Remove("X-Goog-User-Project");
                request.Headers.TryAddWithoutValidation("X-Goog-User-Project", quotaProject);
            }

            var token = await credential.UnderlyingCredential.GetAccessTokenForRequestAsync(cancellationToken: cancellationToken);
            if (string.IsNullOrWhiteSpace(token))
            {
                throw new InvalidOperationException("Google access token is missing.");
            }

            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return await base.SendAsync(request, cancellationToken);
        }
        catch (Exception ex) when (ex is InvalidOperationException or IOException or UnauthorizedAccessException)
        {
            throw new InvalidOperationException(
                "Failed to load Google credentials via ADC. Configure GOOGLE_APPLICATION_CREDENTIALS or workload identity.",
                ex
            );
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
