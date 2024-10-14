namespace api.Externals.Handlers
{
    public class ApiKeyHandler : DelegatingHandler
    {
        private readonly string _apiKey;

        public ApiKeyHandler(IConfiguration configuration)
        {
            _apiKey = configuration["GoogleMaps:ApiKey"]
                      ?? throw new ArgumentNullException("GoogleMaps Api Key is missing.");
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var uriBuilder = new UriBuilder(request.RequestUri);

            var query = System.Web.HttpUtility.ParseQueryString(uriBuilder.Query);
            query["key"] = _apiKey;
            uriBuilder.Query = query.ToString();
            request.RequestUri = uriBuilder.Uri;

            return await base.SendAsync(request, cancellationToken);
        }
    }
}
