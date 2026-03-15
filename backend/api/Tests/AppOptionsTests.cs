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
    private readonly List<string> _tempRoots = [];
    private string? _originalCredentialPath;

    [SetUp]
    public void SetUp()
    {
        _originalCredentialPath = Environment.GetEnvironmentVariable(CredentialEnvVar);
        Environment.SetEnvironmentVariable(CredentialEnvVar, null);
    }

    [TearDown]
    public void TearDown()
    {
        Environment.SetEnvironmentVariable(CredentialEnvVar, _originalCredentialPath);

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
