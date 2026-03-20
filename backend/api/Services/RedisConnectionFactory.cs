using System.Net;
using System.Threading;
using api.Configuration;
using StackExchange.Redis;

namespace api.Services;

public interface IConnectionMultiplexerFactory
{
    Task<IConnectionMultiplexer> GetAsync();
}

public sealed class RedisConnectionFactory : IConnectionMultiplexerFactory, IAsyncDisposable
{
    private readonly RedisOptions _options;
    private readonly IGoogleCredentialFactory _googleCredentialFactory;
    private readonly SemaphoreSlim _mutex = new(1, 1);
    private IConnectionMultiplexer? _cached;
    private DateTimeOffset _refreshAfter = DateTimeOffset.MinValue;

    public RedisConnectionFactory(AppOptions appOptions, IGoogleCredentialFactory googleCredentialFactory)
    {
        _options = appOptions.Redis;
        _googleCredentialFactory = googleCredentialFactory;
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
            _refreshAfter = _options.IamAuthEnabled
                ? DateTimeOffset.UtcNow + _options.GetIamRefreshInterval()
                : DateTimeOffset.MaxValue;

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

        var config = ConfigurationOptions.Parse(endpoint);
        config.AbortOnConnectFail = _options.AbortOnConnectFail;
        if (_options.UseTls)
        {
            config.Ssl = true;
            config.SslHost = ResolveSslHost(config.EndPoints.FirstOrDefault());
        }

        if (_options.IamAuthEnabled)
        {
            var token = await GetAccessTokenAsync();
            if (string.IsNullOrWhiteSpace(token))
            {
                throw new InvalidOperationException("Failed to obtain IAM access token for Redis.");
            }

            config.Password = token;
        }

        return await ConnectionMultiplexer.ConnectAsync(config);
    }

    private static string? ResolveSslHost(EndPoint? endpoint)
        => endpoint switch
        {
            DnsEndPoint dns => dns.Host,
            IPEndPoint ip => ip.Address.ToString(),
            _ => endpoint?.ToString()
        };

    private async Task<string> GetAccessTokenAsync()
    {
        var credential = _googleCredentialFactory.GetCredential(_options.GetIamScopes());
        var token = await credential.UnderlyingCredential.GetAccessTokenForRequestAsync(cancellationToken: default);
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException("Google access token is missing.");
        }

        return token;
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
