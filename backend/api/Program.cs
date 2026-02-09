using api.Configuration;
using api.Externals;
using api.Externals.Handlers;
using api.Services;
using Google.Cloud.SecretManager.V1;

var builder = WebApplication.CreateBuilder(args);

var appOptions = new AppOptions();
builder.Configuration.Bind(appOptions);
builder.Services.AddSingleton(appOptions);

if (appOptions.Mapbox is not null &&
    string.IsNullOrWhiteSpace(appOptions.Mapbox.AccessToken) &&
    !string.IsNullOrWhiteSpace(appOptions.Mapbox.AccessTokenSecret))
{
    appOptions.Mapbox.AccessToken = LoadSecretFromManager(appOptions.Mapbox.AccessTokenSecret);
}

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

builder.Services.AddTransient<MapboxAccessTokenHandler>();
builder.Services.AddHttpClient<IMapboxClient, MapboxClient>(client =>
{
    var apiUrl = appOptions.Mapbox?.ApiUrl;
    if (string.IsNullOrWhiteSpace(apiUrl))
    {
        throw new ArgumentException("No Mapbox API Url provided.");
    }

    client.BaseAddress = new Uri(apiUrl);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
})
.AddHttpMessageHandler<MapboxAccessTokenHandler>();

builder.Services.AddHttpClient<IGoogleMapsClient, GoogleMapsClient>(client =>
{
    var apiUrl = appOptions.GoogleMaps?.ApiUrl;
    if (string.IsNullOrWhiteSpace(apiUrl))
    {
        apiUrl = "https://maps.googleapis.com/maps/api";
    }

    client.BaseAddress = new Uri(apiUrl);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("CorsPolicy");

app.MapControllers();

app.Run();

static string LoadSecretFromManager(string secretRef)
{
    string resolvedRef = secretRef;
    if (!resolvedRef.Contains("/versions/"))
    {
        if (!resolvedRef.StartsWith("projects/", StringComparison.OrdinalIgnoreCase))
        {
            var projectId = Environment.GetEnvironmentVariable("GOOGLE_CLOUD_PROJECT")
                            ?? Environment.GetEnvironmentVariable("GCLOUD_PROJECT");
            if (string.IsNullOrWhiteSpace(projectId))
            {
                throw new ArgumentException("Mapbox access token secret must be a full resource name or GOOGLE_CLOUD_PROJECT must be set.");
            }

            resolvedRef = $"projects/{projectId}/secrets/{resolvedRef}/versions/latest";
        }
        else
        {
            resolvedRef = $"{resolvedRef}/versions/latest";
        }
    }

    try
    {
        var client = SecretManagerServiceClient.Create();
        var response = client.AccessSecretVersion(resolvedRef);
        var payload = response.Payload?.Data?.ToStringUtf8();
        if (string.IsNullOrWhiteSpace(payload))
        {
            throw new ArgumentException("Secret payload is empty.");
        }

        return payload;
    }
    catch (Exception ex)
    {
        throw new ArgumentException($"Failed to load Mapbox access token from Secret Manager: {resolvedRef}", ex);
    }
}
