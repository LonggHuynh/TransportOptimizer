using api.DTOs;
using api.Models;
using api.Services;
using AutoMapper;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GeoCodeController(IGeocodeService geocodeService, IMapper mapper) : ControllerBase
    {
        private readonly IGeocodeService _geocodeService = geocodeService;
        private readonly IMapper _mapper = mapper;


        [HttpGet("")]
        public async Task<GeocodeDto?> GetGeocode([FromQuery] string address)
        {
            var geocode= await _geocodeService.GetGeocode(address);
            return _mapper.Map<GeocodeDto>(geocode);
        }

        [HttpGet("suggest")]
        public async Task<IEnumerable<GeocodeSuggestionDto>> GetSuggestions([FromQuery] string query, [FromQuery] int limit = 6)
        {
            var suggestions = await _geocodeService.GetSuggestions(query, limit);
            return suggestions.Select(suggestion => _mapper.Map<GeocodeSuggestionDto>(suggestion));
        }


    }
}
