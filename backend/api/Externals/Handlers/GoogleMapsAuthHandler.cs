using System.Net.Http.Headers;
using api.Configuration;
using api.Services;

namespace api.Externals.Handlers;

public sealed class GoogleMapsAuthHandler(
    AppOptions appOptions,
    IGoogleAccessTokenProvider googleAccessTokenProvider
) : DelegatingHandler
{
    private readonly AppOptions _appOptions = appOptions;
    private readonly IGoogleAccessTokenProvider _googleAccessTokenProvider = googleAccessTokenProvider;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        var googleOptions = _appOptions.GoogleMaps;
        var token = await _googleAccessTokenProvider.GetAccessTokenAsync(
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
}
