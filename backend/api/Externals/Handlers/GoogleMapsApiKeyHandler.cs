using api.Configuration;

namespace api.Externals.Handlers
{
    public class GoogleMapsApiKeyHandler : DelegatingHandler
    {
        private readonly string _apiKey;

        public GoogleMapsApiKeyHandler(AppOptions appOptions)
        {
            _apiKey = appOptions.GoogleMaps?.ApiKey
                ?? throw new ArgumentNullException("Google Maps API key is missing.");

            if (string.IsNullOrWhiteSpace(_apiKey))
            {
                throw new ArgumentNullException("Google Maps API key is missing.");
            }
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            if (request.RequestUri is null)
            {
                return await base.SendAsync(request, cancellationToken);
            }

            var uriBuilder = new UriBuilder(request.RequestUri);
            var query = System.Web.HttpUtility.ParseQueryString(uriBuilder.Query);
            query["key"] = _apiKey;
            uriBuilder.Query = query.ToString();
            request.RequestUri = uriBuilder.Uri;

            return await base.SendAsync(request, cancellationToken);
        }
    }
}
