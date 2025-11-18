using MeetingRoom.Api.Data;
using MeetingRoom.Api.DTOs;
using MeetingRoom.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MeetingRoom.Api.Services;

public interface IReservationService
{
    Task<IEnumerable<Reservation>> GetByRoomAsync(Guid roomId, DateTime? date = null);
    Task<Reservation> CreateAsync(ReservationDto dto, Guid userId);
    Task DeleteAsync(Guid id);
}

public class ReservationService : IReservationService
{
    private readonly AppDbContext _db;
    public ReservationService(AppDbContext db) => _db = db;

    // retorna reservas por sala — se date fornecido, filtra apenas aquele dia
    public async Task<IEnumerable<Reservation>> GetByRoomAsync(Guid roomId, DateTime? date = null)
    {
        var query = _db.Reservations.AsQueryable().Where(r => r.RoomId == roomId);

        if (date.HasValue)
        {
            var day = date.Value.Date;
            var nextDay = day.AddDays(1);
            query = query.Where(r => r.Date >= day && r.Date < nextDay);
        }

        return await query.OrderBy(r => r.StartTime).ToListAsync();
    }

    // cria reserva com verificação de conflito (traduzível pelo EF)
    public async Task<Reservation> CreateAsync(ReservationDto dto, Guid userId)
    {
        // validações básicas
        var dateOnly = dto.Date.Date;
        if (dto.EndTime <= dto.StartTime)
            throw new ArgumentException("EndTime deve ser maior que StartTime.");

        // opcional: não permitir reservas em datas passadas
        var now = DateTime.UtcNow;
        if (dateOnly < now.Date)
            throw new ArgumentException("Não é possível criar reserva em data passada.");

        // traduzível EF: calcula limites no cliente e usa comparações simples no DB
        var nextDay = dateOnly.AddDays(1);
        var startTime = dto.StartTime;
        var endTime = dto.EndTime;

        // condição de overlap traduzível:
        // existe r tal que r.RoomId == dto.RoomId
        //   && r.Date >= dateOnly && r.Date < nextDay
        //   && r.StartTime < endTime && startTime < r.EndTime
        var hasOverlap = await _db.Reservations.AnyAsync(r =>
            r.RoomId == dto.RoomId &&
            r.Date >= dateOnly && r.Date < nextDay &&
            r.StartTime < endTime &&
            startTime < r.EndTime
        );

        if (hasOverlap)
            throw new InvalidOperationException("Horário indisponível para essa sala.");

        var reservation = new Reservation
        {
            Id = Guid.NewGuid(),
            RoomId = dto.RoomId,
            Date = dateOnly,
            StartTime = startTime,
            EndTime = endTime,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Reservations.Add(reservation);
        await _db.SaveChangesAsync();

        return reservation;
    }

    public async Task DeleteAsync(Guid id)
    {
        var r = await _db.Reservations.FindAsync(id);
        if (r == null) throw new KeyNotFoundException("Reserva não encontrada.");
        _db.Reservations.Remove(r);
        await _db.SaveChangesAsync();
    }
}
