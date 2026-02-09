using Microsoft.AspNetCore.Mvc;
using api.Services;
using api.Models;
using AutoMapper;
using api.DTOs;

namespace api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RouteController(IRouteJobQueue jobQueue, IDistanceService distanceService, IRouteService routeService, IMapper mapper) : ControllerBase
    {
        private readonly IRouteJobQueue _jobQueue = jobQueue;
        private readonly IDistanceService _distanceService = distanceService;
        private readonly IRouteService _routeService = routeService;
        private readonly IMapper _mapper = mapper;
        


        [HttpPost("ComputeOrder")]
        public async Task<ActionResult<ComputeOrderQueuedResponseDto>> ComputeOrder(ComputeOrderRequestDto request)
        {
            var model = _mapper.Map<ComputeOrderRequest>(request);
            var dist = await _distanceService.GetDistanceMatrixAsync(model.Places, model.StartTimeUtc, model.TravelMode);
            var jobId = await _jobQueue.EnqueueAsync(model, dist);
            var response = new ComputeOrderQueuedResponseDto
            {
                JobId = jobId,
                Status = "queued",
            };

            return CreatedAtAction(nameof(GetStatus), new { jobId }, response);
        }

        [HttpGet("ComputeOrder/{jobId}")]
        public async Task<ActionResult<RouteJobStatusDto>> GetStatus(string jobId)
        {
            var status = await _jobQueue.GetStatusAsync(jobId);
            if (status == null)
            {
                return NotFound();
            }

            if (status.Result?.Order is { Count: > 0 })
            {
                var request = await _jobQueue.GetRequestAsync(jobId);
                if (request?.Places is { Length: > 0 })
                {
                    status.Result.BestRoutes = _routeService.BuildBestRoutes(status.Result.Order, request.Places);
                }
            }

            return Ok(status);
        }

    }
}
