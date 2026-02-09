namespace api.Configuration
{
    public class AppOptions
    {
        public GoogleMapsOptions? GoogleMaps { get; set; }
        public CorsSettingsOptions? CorsSettings { get; set; }
        public RedisOptions? Redis { get; set; }
        public CeleryOptions? Celery { get; set; }
    }

    public class GoogleMapsOptions
    {
        public string? ServiceAccountJsonPath { get; set; }
        public string[] ServiceAccountScopes { get; set; } = ["https://www.googleapis.com/auth/cloud-platform"];
        public string? QuotaProject { get; set; }
        public string TilesApiUrl { get; set; } = "https://tile.googleapis.com/v1";
        public string PlacesApiUrl { get; set; } = "https://places.googleapis.com/v1";
        public string RoutesApiUrl { get; set; } = "https://routes.googleapis.com";
        public int TileSize { get; set; } = 256;
        public string TileMapType { get; set; } = "roadmap";
        public string TileLanguage { get; set; } = "en-US";
        public string TileRegion { get; set; } = "US";
    }

    public class CorsSettingsOptions
    {
        public string[]? AllowedOrigins { get; set; }
    }

    public class RedisOptions
    {
        public string? ConnectionString { get; set; }
        public string? Endpoint { get; set; }
        public bool IamAuthEnabled { get; set; }

        public string GetEndpoint()
        {
            var endpoint = Endpoint ?? ConnectionString;
            if (string.IsNullOrWhiteSpace(endpoint))
            {
                throw new ArgumentException("Redis endpoint is missing.");
            }

            return endpoint;
        }
    }

    public class CeleryOptions
    {
        public string Queue { get; set; } = "route";
        public string TaskName { get; set; } = "route.process_job";
    }
}
