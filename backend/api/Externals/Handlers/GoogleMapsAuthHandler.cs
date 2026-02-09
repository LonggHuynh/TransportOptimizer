using System.Net.Http.Headers;
using api.Configuration;
using Google.Apis.Auth.OAuth2;

namespace api.Externals.Handlers;

public sealed class GoogleMapsAuthHandler(AppOptions appOptions, GoogleCredential googleCredential) : DelegatingHandler
{
    private readonly AppOptions _appOptions = appOptions;
    private readonly GoogleCredential _googleCredential = googleCredential;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        var token = await _googleCredential.UnderlyingCredential.GetAccessTokenForRequestAsync(cancellationToken: cancellationToken);
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException("Google access token is missing.");
        }

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var quotaProject = _appOptions.GoogleMaps?.QuotaProject?.Trim();
        if (!string.IsNullOrWhiteSpace(quotaProject))
        {
            request.Headers.Remove("X-Goog-User-Project");
            request.Headers.TryAddWithoutValidation("X-Goog-User-Project", quotaProject);
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
