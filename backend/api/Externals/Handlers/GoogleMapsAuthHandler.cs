using System.Net.Http.Headers;
using api.Configuration;
using api.Services;

namespace api.Externals.Handlers;

public sealed class GoogleMapsAuthHandler(
    AppOptions appOptions,
    IGoogleCredentialFactory googleCredentialFactory
) : DelegatingHandler
{
    private readonly AppOptions _appOptions = appOptions;
    private readonly IGoogleCredentialFactory _googleCredentialFactory = googleCredentialFactory;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        var googleOptions = _appOptions.GoogleMaps;
        var credential = _googleCredentialFactory.GetCredential(
            googleOptions?.ServiceAccountScopes
        );

        var token = await credential.UnderlyingCredential.GetAccessTokenForRequestAsync(cancellationToken: cancellationToken);
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException("Google access token is missing.");
        }

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        return await base.SendAsync(request, cancellationToken);
    }
}
