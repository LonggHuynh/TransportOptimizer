using api.Configuration;
using api.Externals;
using api.Externals.Handlers;
using api.Middlewares;
using api.Services;

var builder = WebApplication.CreateBuilder(args);

var appOptions = new AppOptions();
builder.Configuration.Bind(appOptions);
builder.Services.AddSingleton(appOptions);

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

builder.Services.AddTransient<GoogleMapsErrorHandler>();
builder.Services.AddHttpClient<IGoogleTilesClient, GoogleTilesClient>(client =>
{
    var apiUrl = appOptions.GoogleMaps?.TilesApiUrl;
    if (string.IsNullOrWhiteSpace(apiUrl))
    {
        apiUrl = "https://tile.googleapis.com/v1";
    }

    var normalizedApiUrl = apiUrl.EndsWith('/') ? apiUrl : $"{apiUrl}/";
    client.BaseAddress = new Uri(normalizedApiUrl);
    client.DefaultRequestHeaders.Add("Accept", "*/*");
})
.AddHttpMessageHandler<GoogleMapsErrorHandler>();

builder.Services.AddHttpClient<IGooglePlacesClient, GooglePlacesClient>(client =>
{
    var apiUrl = appOptions.GoogleMaps?.PlacesApiUrl;
    if (string.IsNullOrWhiteSpace(apiUrl))
    {
        apiUrl = "https://places.googleapis.com/v1";
    }

    var normalizedApiUrl = apiUrl.EndsWith('/') ? apiUrl : $"{apiUrl}/";
    client.BaseAddress = new Uri(normalizedApiUrl);
    client.DefaultRequestHeaders.Add("Accept", "application/json");

    var googleMapsApiKey = appOptions.GoogleMaps?.ApiKey;
    if (!string.IsNullOrWhiteSpace(googleMapsApiKey))
    {
        client.DefaultRequestHeaders.Remove("X-Goog-Api-Key");
        client.DefaultRequestHeaders.TryAddWithoutValidation("X-Goog-Api-Key", googleMapsApiKey);
    }
})
.AddHttpMessageHandler<GoogleMapsErrorHandler>();

builder.Services.AddHttpClient<IGoogleRoutesClient, GoogleRoutesClient>(client =>
{
    var apiUrl = appOptions.GoogleMaps?.RoutesApiUrl;
    if (string.IsNullOrWhiteSpace(apiUrl))
    {
        apiUrl = "https://routes.googleapis.com";
    }

    var normalizedApiUrl = apiUrl.EndsWith('/') ? apiUrl : $"{apiUrl}/";
    client.BaseAddress = new Uri(normalizedApiUrl);
    client.DefaultRequestHeaders.Add("Accept", "application/json");

    var googleMapsApiKey = appOptions.GoogleMaps?.ApiKey;
    if (!string.IsNullOrWhiteSpace(googleMapsApiKey))
    {
        client.DefaultRequestHeaders.Remove("X-Goog-Api-Key");
        client.DefaultRequestHeaders.TryAddWithoutValidation("X-Goog-Api-Key", googleMapsApiKey);
    }
})
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
