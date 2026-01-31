namespace api.Configuration
{
    public class AppOptions
    {
        public GoogleMapsOptions? GoogleMaps { get; set; }
        public CorsSettingsOptions? CorsSettings { get; set; }
        public RedisOptions? Redis { get; set; }
    }

    public class GoogleMapsOptions
    {
        public string? ApiKey { get; set; }
        public string? ApiUrl { get; set; }
    }

    public class CorsSettingsOptions
    {
        public string[]? AllowedOrigins { get; set; }
    }

    public class RedisOptions
    {
        public string? ConnectionString { get; set; }
    }
}
