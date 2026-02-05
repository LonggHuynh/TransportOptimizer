namespace api.Configuration
{
    public class AppOptions
    {
        public MapboxOptions? Mapbox { get; set; }
        public CorsSettingsOptions? CorsSettings { get; set; }
        public RedisOptions? Redis { get; set; }
    }

    public class MapboxOptions
    {
        public string? AccessToken { get; set; }
        public string? AccessTokenSecret { get; set; }
        public string? ApiUrl { get; set; }
        public string? TileStyleId { get; set; }
        public string? TileResolution { get; set; } = "low";
        public int TileSize { get; set; } = 256;
        public int GeocodeCacheMinutes { get; set; } = 1440;
        public int GeocodeFailureCacheMinutes { get; set; } = 10;
        public string? DirectionsProfile { get; set; } = "driving";
        public string? MatrixProfile { get; set; } = "driving";
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
}
