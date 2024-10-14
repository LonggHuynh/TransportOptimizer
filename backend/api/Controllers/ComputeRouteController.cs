using Microsoft.AspNetCore.Mvc;
using api.Models;
using api.Services;
using api.DTOs;
using AutoMapper;

namespace api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RouteController(IRouteService routeService, IDistanceService distanceService, IMapper mapper) : ControllerBase
    {
        private readonly IRouteService _routeService = routeService;
        private readonly  IDistanceService _distanceService = distanceService;
        private readonly IMapper _mapper = mapper;
        


        [HttpPost("ComputeOrder")]
        public async Task<RouteResultDto> ComputeOrder(ComputeOrderRequestDto request)
        {
            var requirements = _mapper.Map<List<Requirement>>(request.Requirements);
            var distanceMatrix = await _distanceService.GetDistanceMatrixAsync(request.Places);
            var result = _routeService.ComputeRoute(distanceMatrix, requirements);
            return _mapper.Map<RouteResultDto>(result);
        }
    }
}