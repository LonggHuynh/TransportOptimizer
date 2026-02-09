using api.Configuration;
using api.Externals;
using api.Externals.Handlers;
using api.Middlewares;
using api.Services;
using Google.Apis.Auth.OAuth2;

var builder = WebApplication.CreateBuilder(args);

var appOptions = new AppOptions();
builder.Configuration.Bind(appOptions);
builder.Services.AddSingleton(appOptions);
builder.Services.AddSingleton<GoogleCredential>(_ =>
{
    try
    {
        const string defaultScope = "https://www.googleapis.com/auth/cloud-platform";
        var scopes = appOptions.GoogleMaps?.ServiceAccountScopes?
            .Select(scope => scope?.Trim())
            .Where(scope => !string.IsNullOrWhiteSpace(scope))
            .Select(scope => scope!)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        if (scopes is not { Length: > 0 })
        {
            scopes = [defaultScope];
        }

        var credential = GoogleCredential.GetApplicationDefault();
        if (credential.IsCreateScopedRequired)
        {
            credential = credential.CreateScoped(scopes);
        }

        var quotaProject = appOptions.GoogleMaps?.QuotaProject?.Trim();
        if (!string.IsNullOrWhiteSpace(quotaProject))
        {
            credential = credential.CreateWithQuotaProject(quotaProject);
        }

        return credential;
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
