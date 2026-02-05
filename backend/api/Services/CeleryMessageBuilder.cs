using System;
using System.Text;
using System.Text.Json;

namespace api.Services;

public static class CeleryMessageBuilder
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = null,
        DictionaryKeyPolicy = null
    };

    public static string Build(string taskName, string queueName, string jobId, string origin)
    {
        var bodyPayload = new object?[]
        {
            new object?[] { jobId },
            new Dictionary<string, object?>(),
            new Dictionary<string, object?>
            {
                ["callbacks"] = null,
                ["errbacks"] = null,
                ["chain"] = null,
                ["chord"] = null
            }
        };

        var bodyJson = JsonSerializer.Serialize(bodyPayload, JsonOptions);
        var body = Convert.ToBase64String(Encoding.UTF8.GetBytes(bodyJson));

        var headers = new Dictionary<string, object?>
        {
            ["lang"] = "py",
            ["task"] = taskName,
            ["id"] = jobId,
            ["eta"] = null,
            ["expires"] = null,
            ["group"] = null,
            ["group_index"] = null,
            ["retries"] = 0,
            ["timelimit"] = new object?[] { null, null },
            ["root_id"] = jobId,
            ["parent_id"] = null,
            ["argsrepr"] = $"('{jobId}',)",
            ["kwargsrepr"] = "{}",
            ["origin"] = origin
        };

        var properties = new Dictionary<string, object?>
        {
            ["correlation_id"] = jobId,
            ["reply_to"] = jobId,
            ["delivery_mode"] = 2,
            ["delivery_info"] = new Dictionary<string, object?>
            {
                ["exchange"] = string.Empty,
                ["routing_key"] = queueName
            },
            ["priority"] = 0,
            ["body_encoding"] = "base64",
            ["delivery_tag"] = jobId
        };

        var message = new Dictionary<string, object?>
        {
            ["body"] = body,
            ["content-encoding"] = "utf-8",
            ["content-type"] = "application/json",
            ["headers"] = headers,
            ["properties"] = properties
        };

        return JsonSerializer.Serialize(message, JsonOptions);
    }
}
