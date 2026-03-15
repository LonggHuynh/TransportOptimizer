using System;
using System.Collections.Generic;
using System.IO;
using api.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using NUnit.Framework;

namespace api.Tests;

[TestFixture]
public class AppOptionsTests
{
    private const string CredentialEnvVar = "GOOGLE_APPLICATION_CREDENTIALS";
    private const string OtlpEndpointEnvVar = "OTEL_EXPORTER_OTLP_ENDPOINT";
    private const string OtlpProtocolEnvVar = "OTEL_EXPORTER_OTLP_PROTOCOL";
    private const string OtlpServiceNameEnvVar = "OTEL_SERVICE_NAME";
    private readonly List<string> _tempRoots = [];
    private string? _originalCredentialPath;
    private string? _originalOtlpEndpoint;
    private string? _originalOtlpProtocol;
    private string? _originalOtlpServiceName;

    [SetUp]
    public void SetUp()
    {
        _originalCredentialPath = Environment.GetEnvironmentVariable(CredentialEnvVar);
        _originalOtlpEndpoint = Environment.GetEnvironmentVariable(OtlpEndpointEnvVar);
        _originalOtlpProtocol = Environment.GetEnvironmentVariable(OtlpProtocolEnvVar);
        _originalOtlpServiceName = Environment.GetEnvironmentVariable(OtlpServiceNameEnvVar);

        Environment.SetEnvironmentVariable(CredentialEnvVar, null);
        Environment.SetEnvironmentVariable(OtlpEndpointEnvVar, null);
        Environment.SetEnvironmentVariable(OtlpProtocolEnvVar, null);
        Environment.SetEnvironmentVariable(OtlpServiceNameEnvVar, null);
    }

    [TearDown]
    public void TearDown()
    {
        Environment.SetEnvironmentVariable(CredentialEnvVar, _originalCredentialPath);
        Environment.SetEnvironmentVariable(OtlpEndpointEnvVar, _originalOtlpEndpoint);
        Environment.SetEnvironmentVariable(OtlpProtocolEnvVar, _originalOtlpProtocol);
        Environment.SetEnvironmentVariable(OtlpServiceNameEnvVar, _originalOtlpServiceName);

        foreach (var tempRoot in _tempRoots)
        {
            if (Directory.Exists(tempRoot))
            {
                Directory.Delete(tempRoot, recursive: true);
            }
        }

        _tempRoots.Clear();
    }

    [Test]
    public void ApplyEnvironmentOverrides_WhenCredentialEnvVarAlreadySet_DoesNotOverrideValue()
    {
        var tempRoot = CreateTempRoot();
        var contentRoot = Path.Combine(tempRoot, "src", "api");
        Directory.CreateDirectory(contentRoot);

        var existingPath = "/tmp/already-set.json";
        Environment.SetEnvironmentVariable(CredentialEnvVar, existingPath);

        var configuredPath = Path.Combine(contentRoot, "configured.json");
        File.WriteAllText(configuredPath, "{}");

        var options = new AppOptions
        {
            GoogleApplicationCredentials = "configured.json"
        };
        var environment = CreateEnvironment(contentRoot, Environments.Development);

        options.ApplyEnvironmentOverrides(environment);

        Assert.That(Environment.GetEnvironmentVariable(CredentialEnvVar), Is.EqualTo(existingPath));
    }

    [Test]
    public void ApplyEnvironmentOverrides_WhenConfiguredCredentialFileExists_SetsCredentialEnvVar()
    {
        var tempRoot = CreateTempRoot();
        var contentRoot = Path.Combine(tempRoot, "src", "api");
        Directory.CreateDirectory(contentRoot);

        var configuredPath = Path.Combine(contentRoot, "configured.json");
        File.WriteAllText(configuredPath, "{}");

        var options = new AppOptions
        {
            GoogleApplicationCredentials = "configured.json"
        };
        var environment = CreateEnvironment(contentRoot, Environments.Production);

        options.ApplyEnvironmentOverrides(environment);

        Assert.That(Environment.GetEnvironmentVariable(CredentialEnvVar), Is.EqualTo(configuredPath));
    }

    [Test]
    public void ApplyEnvironmentOverrides_InDevelopment_WhenDefaultCredentialFileExists_SetsFallbackCredentialPath()
    {
        var tempRoot = CreateTempRoot();
        var contentRoot = Path.Combine(tempRoot, "src", "api");
        Directory.CreateDirectory(contentRoot);

        var fallbackCredentialPath = Path.GetFullPath(
            Path.Combine(contentRoot, "..", "..", ".secrets", "gcp-sa.json")
        );
        Directory.CreateDirectory(Path.GetDirectoryName(fallbackCredentialPath)!);
        File.WriteAllText(fallbackCredentialPath, "{}");

        var options = new AppOptions
        {
            GoogleApplicationCredentials = "missing.json"
        };
        var environment = CreateEnvironment(contentRoot, Environments.Development);

        options.ApplyEnvironmentOverrides(environment);

        Assert.That(Environment.GetEnvironmentVariable(CredentialEnvVar), Is.EqualTo(fallbackCredentialPath));
    }

    [Test]
    public void ApplyEnvironmentOverrides_InProduction_WhenOnlyFallbackCredentialFileExists_DoesNotSetCredentialEnvVar()
    {
        var tempRoot = CreateTempRoot();
        var contentRoot = Path.Combine(tempRoot, "src", "api");
        Directory.CreateDirectory(contentRoot);

        var fallbackCredentialPath = Path.GetFullPath(
            Path.Combine(contentRoot, "..", "..", ".secrets", "gcp-sa.json")
        );
        Directory.CreateDirectory(Path.GetDirectoryName(fallbackCredentialPath)!);
        File.WriteAllText(fallbackCredentialPath, "{}");

        var options = new AppOptions
        {
            GoogleApplicationCredentials = "missing.json"
        };
        var environment = CreateEnvironment(contentRoot, Environments.Production);

        options.ApplyEnvironmentOverrides(environment);

        Assert.That(Environment.GetEnvironmentVariable(CredentialEnvVar), Is.Null);
    }

    [Test]
    public void GetEndpoint_WhenEndpointAndConnectionStringAreSet_ReturnsEndpoint()
    {
        var options = new RedisOptions
        {
            Endpoint = "redis-endpoint:6379",
            ConnectionString = "redis-connection-string:6379"
        };

        var endpoint = options.GetEndpoint();

        Assert.That(endpoint, Is.EqualTo("redis-endpoint:6379"));
    }

    [Test]
    public void GetEndpoint_WhenEndpointIsMissing_ReturnsConnectionString()
    {
        var options = new RedisOptions
        {
            ConnectionString = "redis-connection-string:6379"
        };

        var endpoint = options.GetEndpoint();

        Assert.That(endpoint, Is.EqualTo("redis-connection-string:6379"));
    }

    [Test]
    public void GetEndpoint_WhenBothValuesAreMissing_Throws()
    {
        var options = new RedisOptions
        {
            Endpoint = " ",
            ConnectionString = null
        };

        Assert.That(() => options.GetEndpoint(), Throws.ArgumentException.With.Message.EqualTo("Redis endpoint is missing."));
    }

    [Test]
    public void GetIamRefreshInterval_WhenIntervalIsPositive_ReturnsConfiguredValue()
    {
        var options = new RedisOptions
        {
            IamRefreshInterval = TimeSpan.FromMinutes(5)
        };

        var interval = options.GetIamRefreshInterval();

        Assert.That(interval, Is.EqualTo(TimeSpan.FromMinutes(5)));
    }

    [Test]
    public void GetIamRefreshInterval_WhenIntervalIsZeroOrNegative_ReturnsDefaultValue()
    {
        var options = new RedisOptions
        {
            IamRefreshInterval = TimeSpan.Zero
        };

        var interval = options.GetIamRefreshInterval();

        Assert.That(interval, Is.EqualTo(TimeSpan.FromMinutes(45)));
    }

    [Test]
    public void GetIamScopes_WhenProvidedScopesContainWhitespaceAndDuplicates_ReturnsDistinctTrimmedValues()
    {
        var options = new RedisOptions
        {
            IamScopes = ["  scope-a  ", "", "scope-a", "scope-b", "  "]
        };

        var scopes = options.GetIamScopes();

        Assert.That(scopes, Is.EqualTo(new[] { "scope-a", "scope-b" }));
    }

    [Test]
    public void GetIamScopes_WhenAllScopesAreBlank_ReturnsDefaultScope()
    {
        var options = new RedisOptions
        {
            IamScopes = [" ", "\t"]
        };

        var scopes = options.GetIamScopes();

        Assert.That(scopes, Is.EqualTo(new[] { "https://www.googleapis.com/auth/cloud-platform" }));
    }

    [Test]
    public void GetServiceName_WhenEnvironmentVariableIsSet_ReturnsTrimmedEnvironmentValue()
    {
        Environment.SetEnvironmentVariable(OtlpServiceNameEnvVar, " custom-service ");

        var options = new OpenTelemetryOptions
        {
            ServiceName = "fallback-service"
        };

        var serviceName = options.GetServiceName();

        Assert.That(serviceName, Is.EqualTo("custom-service"));
    }

    [Test]
    public void GetServiceName_WhenEnvironmentVariableIsMissing_ReturnsConfiguredFallback()
    {
        var options = new OpenTelemetryOptions
        {
            ServiceName = "fallback-service"
        };

        var serviceName = options.GetServiceName();

        Assert.That(serviceName, Is.EqualTo("fallback-service"));
    }

    [Test]
    public void GetOtlpEndpoint_WhenEnvironmentVariableIsSet_ReturnsTrimmedEnvironmentValue()
    {
        Environment.SetEnvironmentVariable(OtlpEndpointEnvVar, " http://collector:4317 ");

        var options = new OpenTelemetryOptions
        {
            OtlpEndpoint = "http://fallback:4317"
        };

        var endpoint = options.GetOtlpEndpoint();

        Assert.That(endpoint, Is.EqualTo("http://collector:4317"));
    }

    [Test]
    public void GetOtlpEndpoint_WhenEnvironmentVariableIsMissing_ReturnsConfiguredValue()
    {
        var options = new OpenTelemetryOptions
        {
            OtlpEndpoint = "http://fallback:4317"
        };

        var endpoint = options.GetOtlpEndpoint();

        Assert.That(endpoint, Is.EqualTo("http://fallback:4317"));
    }

    [Test]
    public void GetOtlpEndpoint_WhenAllInputsAreBlank_ReturnsNull()
    {
        Environment.SetEnvironmentVariable(OtlpEndpointEnvVar, "   ");

        var options = new OpenTelemetryOptions
        {
            OtlpEndpoint = "   "
        };

        var endpoint = options.GetOtlpEndpoint();

        Assert.That(endpoint, Is.Null);
    }

    [Test]
    public void GetOtlpProtocol_WhenEnvironmentVariableIsSet_ReturnsTrimmedEnvironmentValue()
    {
        Environment.SetEnvironmentVariable(OtlpProtocolEnvVar, " grpc ");

        var options = new OpenTelemetryOptions
        {
            OtlpProtocol = "http/protobuf"
        };

        var protocol = options.GetOtlpProtocol();

        Assert.That(protocol, Is.EqualTo("grpc"));
    }

    [Test]
    public void GetOtlpProtocol_WhenEnvironmentVariableIsMissing_ReturnsConfiguredFallback()
    {
        var options = new OpenTelemetryOptions
        {
            OtlpProtocol = "http/protobuf"
        };

        var protocol = options.GetOtlpProtocol();

        Assert.That(protocol, Is.EqualTo("http/protobuf"));
    }

    private string CreateTempRoot()
    {
        var tempRoot = Path.Combine(Path.GetTempPath(), $"app-options-tests-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempRoot);
        _tempRoots.Add(tempRoot);
        return tempRoot;
    }

    private static IHostEnvironment CreateEnvironment(string contentRootPath, string environmentName)
        => new TestHostEnvironment
        {
            EnvironmentName = environmentName,
            ApplicationName = "api",
            ContentRootPath = contentRootPath,
            ContentRootFileProvider = new NullFileProvider()
        };

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "api";
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
