using api.Externals;
using api.Externals.Handlers;
using api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


builder.Services.AddTransient<ApiKeyHandler>();
builder.Services.AddScoped<IRouteService, RouteService>();
builder.Services.AddScoped<IDistanceService, DistanceService>();
builder.Services.AddScoped<IGoogleMapsClient, GoogleMapsClient>();
builder.Services.AddScoped<IGeocodeService, GeocodeService>();
builder.Services.AddAutoMapper(typeof(MappingProfile));

builder.Services.AddHttpClient<IGoogleMapsClient, GoogleMapsClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration.GetSection("GoogleMaps:ApiUrl").Get<string>() ?? throw new ArgumentException("No maps API Urls provided."));
    client.DefaultRequestHeaders.Add("Accept", "application/json");
})
.AddHttpMessageHandler<ApiKeyHandler>();

var allowedOrigins = builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Get<string[]>();

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
