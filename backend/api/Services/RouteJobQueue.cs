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
    private const string RequestSuffix = ":request";
    private const string StatusSuffix = ":status";
    private const string PayloadSuffix = ":payload";
    private const string ResultSuffix = ":result";

    private readonly IConnectionMultiplexerFactory _redisFactory = redisFactory;
    private readonly CeleryOptions _celeryOptions = appOptions.Celery ?? new CeleryOptions();

    public async Task<string> EnqueueAsync(ComputeOrderRequest request, int[][] distanceMatrix)
    {
        var db = (await _redisFactory.GetAsync()).GetDatabase();
        // Hashed input as key for cached, results removed after configured TTL
        var jobId = request.ComputeJobId();
        var requestKey = GetRequestKey(jobId);
        var statusKey = GetStatusKey(jobId);
        var payloadKey = GetPayloadKey(jobId);

        var requestJson = JsonSerializer.Serialize(request, JsonOptions);
        var payload = new RouteJobPayload
        {
            DistanceMatrix = distanceMatrix,
            StopWindows = request.StopWindows,
        };
        var payloadJson = JsonSerializer.Serialize(payload, JsonOptions);
        var status = new RouteJobRecord
        {
            JobId = jobId,
            Status = "queued",
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        var statusJson = JsonSerializer.Serialize(status, JsonOptions);
        var origin = $"{DefaultOrigin}-{Environment.MachineName}";
        var celeryMessage = CeleryMessageBuilder.Build(_celeryOptions.TaskName, _celeryOptions.Queue, jobId, origin);

        var tran = db.CreateTransaction();
        tran.AddCondition(Condition.KeyNotExists(statusKey));
        _ = tran.StringSetAsync(requestKey, requestJson);
        _ = tran.StringSetAsync(payloadKey, payloadJson);
        _ = tran.StringSetAsync(statusKey, statusJson);
        _ = tran.ListLeftPushAsync(_celeryOptions.Queue, celeryMessage);
        var enqueued = await tran.ExecuteAsync();
        if (!enqueued)
        {
            await db.StringSetAsync(requestKey, requestJson, when: When.NotExists);
            await db.StringSetAsync(payloadKey, payloadJson, when: When.NotExists);
        }

        return jobId;
    }

    public async Task<ComputeOrderRequest?> GetRequestAsync(string jobId)
    {
        var db = (await _redisFactory.GetAsync()).GetDatabase();
        var requestJson = await db.StringGetAsync(GetRequestKey(jobId));
        if (requestJson.IsNullOrEmpty)
        {
            return null;
        }

        return JsonSerializer.Deserialize<ComputeOrderRequest>(requestJson!, JsonOptions);
    }

    public async Task<RouteJobStatusDto?> GetStatusAsync(string jobId)
    {
        var db = (await _redisFactory.GetAsync()).GetDatabase();
        var statusJson = await db.StringGetAsync(GetStatusKey(jobId));
        if (statusJson.IsNullOrEmpty)
        {
            return null;
        }

        var record = JsonSerializer.Deserialize<RouteJobRecord>(statusJson!, JsonOptions);
        if (record == null)
        {
            return null;
        }

        var result = await GetResultAsync(jobId) ?? record.Result;

        return new RouteJobStatusDto
        {
            JobId = record.JobId,
            Status = record.Status,
            Result = result,
            Error = record.Error,
        };
    }

    private static string GetRequestKey(string jobId) => $"{JobKeyPrefix}{jobId}{RequestSuffix}";

    private static string GetStatusKey(string jobId) => $"{JobKeyPrefix}{jobId}{StatusSuffix}";

    private static string GetPayloadKey(string jobId) => $"{JobKeyPrefix}{jobId}{PayloadSuffix}";

    private static string GetResultKey(string jobId) => $"{JobKeyPrefix}{jobId}{ResultSuffix}";

    private async Task<RouteResultDto?> GetResultAsync(string jobId)
    {
        var db = (await _redisFactory.GetAsync()).GetDatabase();
        var resultJson = await db.StringGetAsync(GetResultKey(jobId));
        if (resultJson.IsNullOrEmpty)
        {
            return null;
        }

        return JsonSerializer.Deserialize<RouteResultDto>(resultJson!, JsonOptions);
    }
}
