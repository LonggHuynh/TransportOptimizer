using System;
using System.Text.Json;
using api.Configuration;
using api.DTOs;
using api.Models;
using StackExchange.Redis;

namespace api.Services;

public interface IRouteJobQueue
{
    Task<RouteJobStatusDto?> GetStatusAsync(string jobId);
    Task<string> EnqueueAsync(ComputeOrderRequest request, int[][] distanceMatrix);
    Task<ComputeOrderRequest?> GetRequestAsync(string jobId);
}

public class RouteJobQueue(IConnectionMultiplexerFactory redisFactory, AppOptions appOptions) : IRouteJobQueue
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private const string DefaultOrigin = "transport-optimizer@api";
    private const string JobKeyPrefix = "{route}:job:";

    private readonly IConnectionMultiplexerFactory _redisFactory = redisFactory;
    private readonly CeleryOptions _celeryOptions = appOptions.Celery ?? new CeleryOptions();

    public async Task<string> EnqueueAsync(ComputeOrderRequest request, int[][] distanceMatrix)
    {
        var db = (await _redisFactory.GetAsync()).GetDatabase();
        var jobId = request.ComputeJobId();
        var jobKey = GetJobKey(jobId);
        var jobDoc = new RouteJobRecord
        {
            JobId = jobId,
            Status = "queued",
            UpdatedAt = DateTimeOffset.UtcNow,
            Request = request,
            Payload = new RouteJobPayload
            {
                DistanceMatrix = distanceMatrix,
                StopWindows = request.StopWindows,
            },
        };
        var jobJson = JsonSerializer.Serialize(jobDoc, JsonOptions);
        var origin = $"{DefaultOrigin}-{Environment.MachineName}";

        var created = await db.StringSetAsync(jobKey, jobJson, _celeryOptions.JobTtl, When.NotExists);
        if (created)
        {
            var celeryMessage = CeleryMessageBuilder.Build(_celeryOptions.TaskName, _celeryOptions.Queue, jobId, origin);
            await db.ListLeftPushAsync(_celeryOptions.Queue, celeryMessage);
        }

        return jobId;
    }

    public async Task<ComputeOrderRequest?> GetRequestAsync(string jobId)
    {
        var record = await GetJobRecordAsync(jobId);
        return record?.Request;
    }

    public async Task<RouteJobStatusDto?> GetStatusAsync(string jobId)
    {
        var record = await GetJobRecordAsync(jobId);
        if (record == null)
        {
            return null;
        }

        return new RouteJobStatusDto
        {
            JobId = record.JobId,
            Status = record.Status,
            Result = record.Result,
            Error = record.Error,
        };
    }

    private async Task<RouteJobRecord?> GetJobRecordAsync(string jobId)
    {
        var db = (await _redisFactory.GetAsync()).GetDatabase();
        var jobJson = await db.StringGetAsync(GetJobKey(jobId));
        if (jobJson.IsNullOrEmpty)
        {
            return null;
        }

        return JsonSerializer.Deserialize<RouteJobRecord>(jobJson!, JsonOptions);
    }

    private static string GetJobKey(string jobId) => $"{JobKeyPrefix}{jobId}";
}
