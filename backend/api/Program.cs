using api.Configuration;
using api.Externals;
using api.Externals.Handlers;
using api.Services;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

var appOptions = new AppOptions();
builder.Configuration.Bind(appOptions);
builder.Services.AddSingleton(appOptions);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


builder.Services.AddTransient<ApiKeyHandler>();
builder.Services.AddScoped<IRouteService, RouteService>();
builder.Services.AddScoped<IDistanceService, DistanceService>();
builder.Services.AddScoped<IGoogleMapsClient, GoogleMapsClient>();
builder.Services.AddScoped<IGeocodeService, GeocodeService>();
builder.Services.AddAutoMapper(typeof(MappingProfile));
builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
{
    var connectionString = appOptions.Redis?.ConnectionString;
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new ArgumentException("Redis connection string is missing.");
    }

    return ConnectionMultiplexer.Connect(connectionString);
});
builder.Services.AddSingleton<IRouteJobQueue, RouteJobQueue>();

builder.Services.AddHttpClient<IGoogleMapsClient, GoogleMapsClient>(client =>
{
    var apiUrl = appOptions.GoogleMaps?.ApiUrl;
    if (string.IsNullOrWhiteSpace(apiUrl))
    {
        throw new ArgumentException("No maps API Urls provided.");
    }

    client.BaseAddress = new Uri(apiUrl);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
})
.AddHttpMessageHandler<ApiKeyHandler>();

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
