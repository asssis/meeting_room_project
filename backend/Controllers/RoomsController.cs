using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MeetingRoom.Api.Data;
using MeetingRoom.Api.DTOs;
using MeetingRoom.Api.Models;

namespace MeetingRoom.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    private readonly AppDbContext _db;
    public RoomsController(AppDbContext db) => _db = db;

    // GET: api/rooms
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _db.Rooms.ToListAsync());

    // GET: api/rooms/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var room = await _db.Rooms.FindAsync(id);
        return room is null ? NotFound() : Ok(room);
    }

    // POST: api/rooms
    [HttpPost]
    public async Task<IActionResult> Create(RoomDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var room = new Room
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Capacity = dto.Capacity,
            Location = dto.Location,
            Description = dto.Description
        };

        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = room.Id }, room);
    }

    // PUT: api/rooms/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, RoomDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var room = await _db.Rooms.FindAsync(id);
        if (room is null)
            return NotFound();

        room.Name = dto.Name;
        room.Capacity = dto.Capacity;
        room.Location = dto.Location;
        room.Description = dto.Description;

        await _db.SaveChangesAsync();
        return Ok(room);
    }

    // DELETE: api/rooms/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var room = await _db.Rooms.FindAsync(id);
        if (room is null)
            return NotFound();

        _db.Rooms.Remove(room);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
