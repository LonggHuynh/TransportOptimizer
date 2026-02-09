using api.Configuration;
using api.Externals;
using api.Externals.Handlers;
using api.Middlewares;
using api.Services;
using Google.Apis.Auth.OAuth2;

var builder = WebApplication.CreateBuilder(args);

var appOptions = new AppOptions();
builder.Configuration.Bind(appOptions);

var quotaProject =
    appOptions.GoogleMaps?.QuotaProject
    ?? Environment.GetEnvironmentVariable("GOOGLE_CLOUD_QUOTA_PROJECT")
    ?? Environment.GetEnvironmentVariable("GOOGLE_CLOUD_PROJECT");

if (!string.IsNullOrWhiteSpace(quotaProject))
{
    appOptions.GoogleMaps ??= new GoogleMapsOptions();
    appOptions.GoogleMaps.QuotaProject = quotaProject.Trim();
}

if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS")) && builder.Environment.IsDevelopment())
{
    var backendRootPath = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, ".."));
    var localCredentialPath = Directory.EnumerateFiles(backendRootPath, "pathoptimizer-*.json")
        .FirstOrDefault();

    if (!string.IsNullOrWhiteSpace(localCredentialPath))
    {
        Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", localCredentialPath);
    }
}

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
    var apiUrl = appOptions.GoogleMaps?.TilesApiUrl ?? "https://tile.googleapis.com/v1";
    var normalizedApiUrl = apiUrl.EndsWith('/') ? apiUrl : $"{apiUrl}/";
    client.BaseAddress = new Uri(normalizedApiUrl);
    client.DefaultRequestHeaders.Add("Accept", "*/*");
})
.AddHttpMessageHandler<GoogleMapsAuthHandler>()
.AddHttpMessageHandler<GoogleMapsErrorHandler>();

builder.Services.AddHttpClient<IGooglePlacesClient, GooglePlacesClient>(client =>
{
    var apiUrl = appOptions.GoogleMaps?.PlacesApiUrl ?? "https://places.googleapis.com/v1";
    var normalizedApiUrl = apiUrl.EndsWith('/') ? apiUrl : $"{apiUrl}/";
    client.BaseAddress = new Uri(normalizedApiUrl);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
})
.AddHttpMessageHandler<GoogleMapsAuthHandler>()
.AddHttpMessageHandler<GoogleMapsErrorHandler>();

builder.Services.AddHttpClient<IGoogleRoutesClient, GoogleRoutesClient>(client =>
{
    var apiUrl = appOptions.GoogleMaps?.RoutesApiUrl ?? "https://routes.googleapis.com";
    var normalizedApiUrl = apiUrl.EndsWith('/') ? apiUrl : $"{apiUrl}/";
    client.BaseAddress = new Uri(normalizedApiUrl);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
})
.AddHttpMessageHandler<GoogleMapsAuthHandler>()
.AddHttpMessageHandler<GoogleMapsErrorHandler>();

var allowedOrigins = appOptions.CorsSettings?.AllowedOrigins ?? [];
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

var app = builder.Build();

app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("CorsPolicy");

app.MapControllers();

app.Run();
