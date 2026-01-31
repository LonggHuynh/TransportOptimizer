using System.Text.Json;
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

public class RouteJobQueue(IConnectionMultiplexer redis) : IRouteJobQueue
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private const string QueueKey = "route:queue";
    private const string JobKeyPrefix = "route:job:";
    private const string RequestSuffix = ":request";
    private const string StatusSuffix = ":status";
    private const string PayloadSuffix = ":payload";
    private const string ResultSuffix = ":result";

    private readonly IDatabase _db = redis.GetDatabase();

    public async Task<string> EnqueueAsync(ComputeOrderRequest request, int[][] distanceMatrix)
    {
        // Hashed input as key for cached, results removed after configured TTL
        var jobId = request.ComputeJobId();
        var requestKey = GetRequestKey(jobId);
        var statusKey = GetStatusKey(jobId);
        var payloadKey = GetPayloadKey(jobId);

        var requestJson = JsonSerializer.Serialize(request, JsonOptions);
        var payload = new RouteJobPayload
        {
            DistanceMatrix = distanceMatrix,
            Requirements = request.Requirements,
        };
        var payloadJson = JsonSerializer.Serialize(payload, JsonOptions);
        var status = new RouteJobRecord
        {
            JobId = jobId,
            Status = "queued",
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        var statusJson = JsonSerializer.Serialize(status, JsonOptions);

        var tran = _db.CreateTransaction();
        tran.AddCondition(Condition.KeyNotExists(statusKey));
        _ = tran.StringSetAsync(requestKey, requestJson);
        _ = tran.StringSetAsync(payloadKey, payloadJson);
        _ = tran.StringSetAsync(statusKey, statusJson);
        _ = tran.ListLeftPushAsync(QueueKey, jobId);
        var enqueued = await tran.ExecuteAsync();
        if (!enqueued)
        {
            await _db.StringSetAsync(requestKey, requestJson, when: When.NotExists);
            await _db.StringSetAsync(payloadKey, payloadJson, when: When.NotExists);
        }

        return jobId;
    }

    public async Task<ComputeOrderRequest?> GetRequestAsync(string jobId)
    {
        var requestJson = await _db.StringGetAsync(GetRequestKey(jobId));
        if (requestJson.IsNullOrEmpty)
        {
            return null;
        }

        return JsonSerializer.Deserialize<ComputeOrderRequest>(requestJson!, JsonOptions);
    }

    public async Task<RouteJobStatusDto?> GetStatusAsync(string jobId)
    {
        var statusJson = await _db.StringGetAsync(GetStatusKey(jobId));
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
        var resultJson = await _db.StringGetAsync(GetResultKey(jobId));
        if (resultJson.IsNullOrEmpty)
        {
            return null;
        }

        return JsonSerializer.Deserialize<RouteResultDto>(resultJson!, JsonOptions);
    }
}
