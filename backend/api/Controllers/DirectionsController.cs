using api.DTOs;
using api.Services;
using AutoMapper;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DirectionsController(IDirectionsService directionsService, IMapper mapper) : ControllerBase
    {
        private readonly IDirectionsService _directionsService = directionsService;
        private readonly IMapper _mapper = mapper;

        [HttpGet("")]
        public async Task<ActionResult<DirectionsResponseDto>> GetDirections([FromQuery] string from, [FromQuery] string to)
        {
            if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
            {
                return BadRequest("Both from and to addresses are required.");
            }

            var result = await _directionsService.GetDirectionsAsync(from, to);
            if (result == null)
            {
                return NotFound();
            }

            var response = new DirectionsResponseDto
            {
                DistanceMeters = result.DistanceMeters,
                DurationSeconds = result.DurationSeconds,
                Coordinates = result.Coordinates
                    .Select(coord => _mapper.Map<GeocodeDto>(coord))
                    .ToList(),
            };

            return Ok(response);
        }
    }
}
