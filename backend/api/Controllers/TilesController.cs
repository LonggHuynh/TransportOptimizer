using api.Services;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers
{
    [ApiController]
    [Route("api/tiles")]
    public class TilesController(ITileService tileService) : ControllerBase
    {
        private readonly ITileService _tileService = tileService;

        [HttpGet("{z:int}/{x:int}/{y:int}.png")]
        public async Task<IActionResult> GetTile(int z, int x, int y)
        {
            var result = await _tileService.GetTileAsync(z, x, y, Request.Headers.IfNoneMatch.ToString());
            if (!string.IsNullOrWhiteSpace(result.CacheControl))
            {
                Response.Headers["Cache-Control"] = result.CacheControl;
            }

            if (!string.IsNullOrWhiteSpace(result.ETag))
            {
                Response.Headers["ETag"] = result.ETag;
            }

            return result.StatusCode switch
            {
                StatusCodes.Status200OK => File(result.Data!, result.ContentType!),
                StatusCodes.Status304NotModified => StatusCode(StatusCodes.Status304NotModified),
                StatusCodes.Status400BadRequest => BadRequest(result.Error),
                StatusCodes.Status404NotFound => NotFound(),
                _ => StatusCode(result.StatusCode),
            };
        }
    }
}
