using api.Configuration;

namespace api.Externals.Handlers
{
    public class MapboxAccessTokenHandler : DelegatingHandler
    {
        private readonly string _accessToken;

        public MapboxAccessTokenHandler(AppOptions appOptions)
        {
            _accessToken = appOptions.Mapbox?.AccessToken
                      ?? throw new ArgumentNullException("Mapbox access token is missing.");

            if (string.IsNullOrWhiteSpace(_accessToken))
            {
                throw new ArgumentNullException("Mapbox access token is missing.");
            }
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var uriBuilder = new UriBuilder(request.RequestUri);

            var query = System.Web.HttpUtility.ParseQueryString(uriBuilder.Query);
            query["access_token"] = _accessToken;
            uriBuilder.Query = query.ToString();
            request.RequestUri = uriBuilder.Uri;

            return await base.SendAsync(request, cancellationToken);
        }
    }
}
