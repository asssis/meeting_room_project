using Microsoft.AspNetCore.Mvc;
using MeetingRoom.Api.DTOs;
using MeetingRoom.Api.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace MeetingRoom.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReservationsController : ControllerBase
{
    private readonly IReservationService _reservationService;
    public ReservationsController(IReservationService reservationService)
    {
        _reservationService = reservationService;
    }

    // GET /api/reservations?roomId=xxx&date=yyyy-MM-dd
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] Guid roomId, [FromQuery] DateTime? date)
    {
        var list = await _reservationService.GetByRoomAsync(roomId, date);
        return Ok(list);
    }

    // POST /api/reservations
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create(ReservationDto dto)
    {
        try
        {
            // pega user logado pelo JWT
            var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (sub == null) return Unauthorized();

            var userId = Guid.Parse(sub);

            var created = await _reservationService.CreateAsync(dto, userId);
            return Ok(created);
        }
        catch (Exception ex)
        {
            // log detalhado no server (remova depois)
            var logger = HttpContext.RequestServices.GetRequiredService<ILogger<ReservationsController>>();
            logger.LogError(ex, "Erro ao criar reserva: {Message}", ex.Message);
            if (ex.InnerException != null)
            {
                logger.LogError("Inner exception: {Inner}", ex.InnerException.ToString());
            }

            // retorno para debug local (remova em produção)
        #if DEBUG
            return BadRequest(new { error = ex.Message, inner = ex.InnerException?.Message, stack = ex.StackTrace });
        #else
            return BadRequest(new { error = "Erro ao processar requisição" });
        #endif
        }

    }

    // DELETE /api/reservations/{id}
    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _reservationService.DeleteAsync(id);
            return Ok(new { message = "Deleted" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
