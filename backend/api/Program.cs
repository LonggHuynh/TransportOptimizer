using api.Configuration;
using api.Externals;
using api.Externals.Handlers;
using api.Middlewares;
using api.Services;
using Google.Apis.Auth.OAuth2;
using OpenTelemetry.Exporter;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.Configure(options =>
{
    options.ActivityTrackingOptions =
        ActivityTrackingOptions.TraceId
        | ActivityTrackingOptions.SpanId
        | ActivityTrackingOptions.ParentId;
});
builder.Logging.AddJsonConsole(options =>
{
    options.IncludeScopes = true;
    options.UseUtcTimestamp = true;
    options.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffZ";
});

var appOptions = new AppOptions();
builder.Configuration.Bind(appOptions);
appOptions.ApplyEnvironmentOverrides(builder.Environment);

builder.Services.AddSingleton(appOptions);
builder.Services.AddSingleton<GoogleCredential>(_ =>
{
    try
    {
        return GoogleCredential.GetApplicationDefault();
    }
    catch (Exception ex) when (ex is InvalidOperationException or IOException or UnauthorizedAccessException)
    {
        throw new InvalidOperationException(
            "Failed to load Google credentials via ADC. Configure GOOGLE_APPLICATION_CREDENTIALS or workload identity.",
            ex
        );
    }
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddMemoryCache();

var traceServiceName = appOptions.OpenTelemetry.GetServiceName();
var otlpEndpoint = appOptions.OpenTelemetry.GetOtlpEndpoint();
var otlpProtocol = appOptions.OpenTelemetry.GetOtlpProtocol();
builder.Services
    .AddOpenTelemetry()
    .ConfigureResource(resource => resource.AddService(traceServiceName))
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation(options => options.RecordException = true)
            .AddHttpClientInstrumentation(options => options.RecordException = true);

        if (!string.IsNullOrWhiteSpace(otlpEndpoint))
        {
            tracing.AddOtlpExporter(options =>
            {
                options.Endpoint = new Uri(otlpEndpoint);
                if (string.Equals(otlpProtocol, "http/protobuf", StringComparison.OrdinalIgnoreCase))
                {
                    options.Protocol = OtlpExportProtocol.HttpProtobuf;
                }
            });
        }
    });


builder.Services.AddScoped<IRouteService, RouteService>();
builder.Services.AddScoped<IDistanceService, DistanceService>();
builder.Services.AddScoped<IGeocodeService, GeocodeService>();
builder.Services.AddScoped<IDirectionsService, DirectionsService>();
builder.Services.AddScoped<ITileService, TileService>();
builder.Services.AddAutoMapper(typeof(MappingProfile));
builder.Services.AddSingleton<IGoogleCredentialFactory, GoogleCredentialFactory>();
builder.Services.AddSingleton<IConnectionMultiplexerFactory, RedisConnectionFactory>();
builder.Services.AddSingleton<IRouteJobQueue, RouteJobQueue>();

builder.Services.AddTransient<GoogleMapsAuthHandler>();
builder.Services.AddTransient<GoogleMapsErrorHandler>();
builder.Services.AddHttpClient<IGoogleTilesClient, GoogleTilesClient>(client =>
{
    var apiUrl = appOptions.GoogleMaps.TilesApiUrl;
    var normalizedApiUrl = apiUrl.EndsWith('/') ? apiUrl : $"{apiUrl}/";
    client.BaseAddress = new Uri(normalizedApiUrl);
    client.DefaultRequestHeaders.Add("Accept", "*/*");
})
.AddHttpMessageHandler<GoogleMapsAuthHandler>()
.AddHttpMessageHandler<GoogleMapsErrorHandler>();

builder.Services.AddHttpClient<IGooglePlacesClient, GooglePlacesClient>(client =>
{
    var apiUrl = appOptions.GoogleMaps.PlacesApiUrl;
    var normalizedApiUrl = apiUrl.EndsWith('/') ? apiUrl : $"{apiUrl}/";
    client.BaseAddress = new Uri(normalizedApiUrl);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
})
.AddHttpMessageHandler<GoogleMapsAuthHandler>()
.AddHttpMessageHandler<GoogleMapsErrorHandler>();

builder.Services.AddHttpClient<IGoogleRoutesClient, GoogleRoutesClient>(client =>
{
    var apiUrl = appOptions.GoogleMaps.RoutesApiUrl;
    var normalizedApiUrl = apiUrl.EndsWith('/') ? apiUrl : $"{apiUrl}/";
    client.BaseAddress = new Uri(normalizedApiUrl);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
})
.AddHttpMessageHandler<GoogleMapsAuthHandler>()
.AddHttpMessageHandler<GoogleMapsErrorHandler>();

var allowedOrigins = (appOptions.CorsSettings.AllowedOrigins ?? [])
    .Select(origin => origin?.Trim())
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Select(origin => origin!)
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();
var invalidOrigins = allowedOrigins.Where(IsInvalidCorsOrigin).ToArray();
if (invalidOrigins.Length > 0)
{
    throw new InvalidOperationException(
        $"Invalid CorsSettings.AllowedOrigins value(s): {string.Join(", ", invalidOrigins)}"
    );
}

var corsEnabled = allowedOrigins.Length > 0;
if (corsEnabled)
{
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("CorsPolicy", builder =>
        {
            builder.WithOrigins(allowedOrigins)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        });
    });
}

var app = builder.Build();

app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

if (corsEnabled)
{
    app.UseCors("CorsPolicy");
}

app.MapControllers();
app.MapGet("/healthz", () => Results.Ok(new { status = "ok" }));

app.Run();

static bool IsInvalidCorsOrigin(string origin)
{
    if (origin.Contains('<') || origin.Contains('>'))
    {
        return true;
    }

    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
    {
        return true;
    }

    if (!string.Equals(uri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
        && !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
    {
        return true;
    }

    var normalizedOrigin = origin.EndsWith('/') ? origin[..^1] : origin;
    var authorityOnly = uri.GetLeftPart(UriPartial.Authority);
    return !string.Equals(authorityOnly, normalizedOrigin, StringComparison.OrdinalIgnoreCase);
}
