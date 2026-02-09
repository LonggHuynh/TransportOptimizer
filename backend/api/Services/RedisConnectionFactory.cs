using System.Threading;
using api.Configuration;
using Google.Apis.Auth.OAuth2;
using StackExchange.Redis;

namespace api.Services;

public interface IConnectionMultiplexerFactory
{
    Task<IConnectionMultiplexer> GetAsync();
}

public sealed class RedisConnectionFactory : IConnectionMultiplexerFactory, IAsyncDisposable
{
    private static readonly TimeSpan IamRefreshInterval = TimeSpan.FromMinutes(45);
    private const string IamScope = "https://www.googleapis.com/auth/cloud-platform";

    private readonly RedisOptions _options;
    private readonly SemaphoreSlim _mutex = new(1, 1);
    private IConnectionMultiplexer? _cached;
    private DateTimeOffset _refreshAfter = DateTimeOffset.MinValue;

    public RedisConnectionFactory(AppOptions appOptions)
    {
        _options = appOptions.Redis ?? throw new ArgumentException("Redis settings are missing.");
    }

    public Task<IConnectionMultiplexer> GetAsync() => GetOrCreateAsync();

    private async Task<IConnectionMultiplexer> GetOrCreateAsync()
    {
        if (_cached != null && DateTimeOffset.UtcNow < _refreshAfter && _cached.IsConnected)
        {
            return _cached;
        }

        await _mutex.WaitAsync();
        try
        {
            if (_cached != null && DateTimeOffset.UtcNow < _refreshAfter && _cached.IsConnected)
            {
                return _cached;
            }

            var next = await ConnectAsync();
            var previous = _cached;
            _cached = next;
            _refreshAfter = _options.IamAuthEnabled ? DateTimeOffset.UtcNow + IamRefreshInterval : DateTimeOffset.MaxValue;

            if (previous != null)
            {
                await previous.CloseAsync();
                previous.Dispose();
            }

            return next;
        }
        finally
        {
            _mutex.Release();
        }
    }

    private async Task<IConnectionMultiplexer> ConnectAsync()
    {
        var endpoint = _options.GetEndpoint();

        if (!_options.IamAuthEnabled)
        {
            return await ConnectionMultiplexer.ConnectAsync(endpoint);
        }

        var token = await GetAccessTokenAsync();
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException("Failed to obtain IAM access token for Redis.");
        }

        var config = ConfigurationOptions.Parse(endpoint);
        config.Password = token;
        config.AbortOnConnectFail = false;

        return await ConnectionMultiplexer.ConnectAsync(config);
    }

    private async Task<string> GetAccessTokenAsync()
    {
        try
        {
            var credential = await GoogleCredential.GetApplicationDefaultAsync();
            if (credential.IsCreateScopedRequired)
            {
                credential = credential.CreateScoped(IamScope);
            }

            var token = await credential.UnderlyingCredential.GetAccessTokenForRequestAsync(cancellationToken: default);
            if (string.IsNullOrWhiteSpace(token))
            {
                throw new InvalidOperationException("Google access token is missing.");
            }

            return token;
        }
        catch (Exception ex) when (ex is InvalidOperationException or IOException or UnauthorizedAccessException)
        {
            throw new InvalidOperationException(
                "Failed to load Google credentials via ADC. Configure GOOGLE_APPLICATION_CREDENTIALS or workload identity.",
                ex
            );
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_cached != null)
        {
            await _cached.CloseAsync();
            _cached.Dispose();
        }

        _mutex.Dispose();
    }
}
