namespace api.Configuration
{
    public class AppOptions
    {
        public GoogleMapsOptions GoogleMaps { get; set; } = new();
        public CorsSettingsOptions CorsSettings { get; set; } = new();
        public RedisOptions Redis { get; set; } = new();
        public CeleryOptions Celery { get; set; } = new();
        public OpenTelemetryOptions OpenTelemetry { get; set; } = new();

        public void ApplyEnvironmentOverrides()
        {
            GoogleMaps.ApplyEnvironmentOverrides();
        }
    }

    public class GoogleMapsOptions
    {
        public string[] ServiceAccountScopes { get; set; } = ["https://www.googleapis.com/auth/cloud-platform"];
        public string? QuotaProject { get; set; }
        public string TilesApiUrl { get; set; } = "https://tile.googleapis.com/v1";
        public string PlacesApiUrl { get; set; } = "https://places.googleapis.com/v1";
        public string RoutesApiUrl { get; set; } = "https://routes.googleapis.com";
        public int TileSize { get; set; } = 256;
        public string TileMapType { get; set; } = "roadmap";
        public string TileLanguage { get; set; } = "en-US";
        public string TileRegion { get; set; } = "US";

        public void ApplyEnvironmentOverrides()
        {
            var quotaProject = FirstNonEmpty(
                QuotaProject,
                Environment.GetEnvironmentVariable("GOOGLE_CLOUD_QUOTA_PROJECT"),
                Environment.GetEnvironmentVariable("GOOGLE_CLOUD_PROJECT")
            );
            QuotaProject = string.IsNullOrWhiteSpace(quotaProject) ? null : quotaProject.Trim();
        }

        private static string? FirstNonEmpty(params string?[] values)
            => values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));
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
        public TimeSpan IamRefreshInterval { get; set; } = TimeSpan.FromMinutes(45);
        public string[] IamScopes { get; set; } = ["https://www.googleapis.com/auth/cloud-platform"];
        public bool AbortOnConnectFail { get; set; }

        public string GetEndpoint()
        {
            var endpoint = Endpoint ?? ConnectionString;
            if (string.IsNullOrWhiteSpace(endpoint))
            {
                throw new ArgumentException("Redis endpoint is missing.");
            }

            return endpoint;
        }

        public TimeSpan GetIamRefreshInterval()
            => IamRefreshInterval > TimeSpan.Zero ? IamRefreshInterval : TimeSpan.FromMinutes(45);

        public string[] GetIamScopes()
        {
            var scopes = IamScopes
                .Select(scope => scope?.Trim())
                .Where(scope => !string.IsNullOrWhiteSpace(scope))
                .Select(scope => scope!)
                .Distinct(StringComparer.Ordinal)
                .ToArray();
            return scopes.Length > 0 ? scopes : ["https://www.googleapis.com/auth/cloud-platform"];
        }
    }

    public class CeleryOptions
    {
        public string Queue { get; set; } = "route";
        public string TaskName { get; set; } = "route.process_job";
        public TimeSpan JobTtl { get; set; } = TimeSpan.FromMinutes(5);
    }

    public class OpenTelemetryOptions
    {
        public string ServiceName { get; set; } = "transport-optimizer-backend";
        public string? OtlpEndpoint { get; set; }
        public string OtlpProtocol { get; set; } = "http/protobuf";

        public string GetServiceName()
            => NormalizeOrDefault(
                Environment.GetEnvironmentVariable("OTEL_SERVICE_NAME"),
                ServiceName
            );

        public string? GetOtlpEndpoint()
            => NormalizeOrNull(
                Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT")
                ?? OtlpEndpoint
            );

        public string GetOtlpProtocol()
            => NormalizeOrDefault(
                Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_PROTOCOL"),
                OtlpProtocol
            );

        private static string NormalizeOrDefault(string? value, string fallback)
        {
            var normalized = value?.Trim();
            return string.IsNullOrWhiteSpace(normalized) ? fallback : normalized;
        }

        private static string? NormalizeOrNull(string? value)
        {
            var normalized = value?.Trim();
            return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
        }
    }
}
