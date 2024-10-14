using api.DTOs;
using api.Models;
using api.Services;
using AutoMapper;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers
{
    [ApiController]
    [Route("[controller]")]
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


    }
}
